import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import {
  FinishType,
  OrderPriority,
  OrderSource,
  OrderStatus,
  Prisma,
  ProductionStage,
} from "@prisma/client";
import { recomputeAndPersistOrderStatus } from "@/lib/order-workflow";
import { invalidateReadCaches } from "@/lib/server-cache";

const updateSchema = z.object({
  customerId: z.string().min(1).optional(),
  promisedDeliveryDate: z.string().optional(),
  source: z.nativeEnum(OrderSource).optional(),
  priority: z.nativeEnum(OrderPriority).optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      productId: z.string().min(1),
      size: z.string().optional(),
      quantity: z.number().int().min(1),
      finishType: z.nativeEnum(FinishType).default("PLAIN"),
      rawMaterialRequired: z.boolean().default(false),
      notes: z.string().optional(),
    })
  ).optional(),
});

function createHttpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function sumDispatchedQty(
  orderItem: Prisma.OrderItemGetPayload<{
    include: { dispatchItems: true };
  }>
) {
  return orderItem.dispatchItems.reduce((total, item) => total + item.qtyDispatched, 0);
}

function resolveUpdatedStage(params: {
  currentStage: ProductionStage;
  rawMaterialRequired: boolean;
  hasVendorLinks: boolean;
  hasPendingVendorLinks: boolean;
}) {
  const { currentStage, rawMaterialRequired, hasVendorLinks, hasPendingVendorLinks } = params;

  if (rawMaterialRequired && (hasPendingVendorLinks || (!hasVendorLinks && currentStage === "NOT_STARTED"))) {
    return "WAITING_MATERIAL";
  }

  if (!rawMaterialRequired && currentStage === "WAITING_MATERIAL") {
    return "NOT_STARTED";
  }

  if (rawMaterialRequired && !hasPendingVendorLinks && currentStage === "WAITING_MATERIAL") {
    return "NOT_STARTED";
  }

  return currentStage;
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      orderItems: {
        include: {
          product: true,
          vendorRequestItems: {
            include: { vendorRequest: { include: { vendor: true } } },
          },
          productionLogs: {
            orderBy: { loggedAt: "desc" },
            take: 5,
            include: { updatedBy: { select: { name: true } } },
          },
          dispatchItems: {
            include: { dispatch: true },
          },
        },
      },
      dispatches: {
        orderBy: { dispatchDate: "desc" },
        include: {
          dispatchItems: { include: { orderItem: { include: { product: true } } } },
          createdBy: { select: { name: true } },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await db.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id },
        include: {
          orderItems: {
            include: {
              vendorRequestItems: true,
              dispatchItems: true,
              productionLogs: {
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!existingOrder) {
        throw createHttpError("Order not found", 404);
      }

      const data: Record<string, unknown> = {
        customerId: parsed.data.customerId,
        source: parsed.data.source,
        priority: parsed.data.priority,
        status: parsed.data.status,
        notes: parsed.data.notes,
      };

      if (parsed.data.promisedDeliveryDate !== undefined) {
        data.promisedDeliveryDate = parsed.data.promisedDeliveryDate
          ? new Date(parsed.data.promisedDeliveryDate)
          : null;
      }

      await tx.order.update({
        where: { id },
        data,
      });

      if (parsed.data.items) {
        const existingItemsById = new Map(existingOrder.orderItems.map((item) => [item.id, item]));
        const incomingExistingIds = new Set(
          parsed.data.items.filter((item) => item.id).map((item) => item.id as string)
        );

        for (const existingItem of existingOrder.orderItems) {
          if (incomingExistingIds.has(existingItem.id)) continue;

          const dispatchedQty = sumDispatchedQty(existingItem);
          const hasVendorLinks = existingItem.vendorRequestItems.length > 0;
          const hasProductionLogs = existingItem.productionLogs.length > 0;

          if (dispatchedQty > 0 || hasVendorLinks || hasProductionLogs) {
            throw createHttpError(
              `Cannot remove item ${existingItem.id} because work has already started or it is linked to other records.`
            );
          }

          await tx.orderItem.delete({ where: { id: existingItem.id } });
        }

        for (const item of parsed.data.items) {
          if (item.id) {
            const existingItem = existingItemsById.get(item.id);
            if (!existingItem) {
              throw createHttpError("One or more items do not belong to this order.");
            }

            const dispatchedQty = sumDispatchedQty(existingItem);
            const hasVendorLinks = existingItem.vendorRequestItems.length > 0;
            const hasPendingVendorLinks = existingItem.vendorRequestItems.some(
              (vendorRequestItem) => vendorRequestItem.pendingQty > 0
            );
            const hasProductionLogs = existingItem.productionLogs.length > 0;

            if (item.quantity < dispatchedQty) {
              throw createHttpError(
                `Quantity for ${item.id} cannot be lower than already dispatched quantity (${dispatchedQty}).`
              );
            }

            if (!item.rawMaterialRequired && hasVendorLinks) {
              throw createHttpError(
                `Cannot mark item ${item.id} as not requiring raw material because vendor requests are already linked.`
              );
            }

            if (item.productId !== existingItem.productId && (hasVendorLinks || dispatchedQty > 0 || hasProductionLogs)) {
              throw createHttpError(
                `Cannot change product for item ${item.id} after production, dispatch, or vendor activity has started.`
              );
            }

            await tx.orderItem.update({
              where: { id: item.id },
              data: {
                productId: item.productId,
                size: item.size,
                quantity: item.quantity,
                finishType: item.finishType,
                rawMaterialRequired: item.rawMaterialRequired,
                notes: item.notes,
                productionStage: resolveUpdatedStage({
                  currentStage: existingItem.productionStage,
                  rawMaterialRequired: item.rawMaterialRequired,
                  hasVendorLinks,
                  hasPendingVendorLinks,
                }),
              },
            });
          } else {
            await tx.orderItem.create({
              data: {
                orderId: id,
                productId: item.productId,
                size: item.size,
                quantity: item.quantity,
                finishType: item.finishType,
                rawMaterialRequired: item.rawMaterialRequired,
                notes: item.notes,
                productionStage: item.rawMaterialRequired ? "WAITING_MATERIAL" : "NOT_STARTED",
              },
            });
          }
        }
      }

      await recomputeAndPersistOrderStatus(tx, id);
    }, {
      timeout: 15000,
      maxWait: 10000,
    });

    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true,
            vendorRequestItems: {
              include: { vendorRequest: { include: { vendor: true } } },
            },
            productionLogs: {
              orderBy: { loggedAt: "desc" },
              take: 5,
              include: { updatedBy: { select: { name: true } } },
            },
            dispatchItems: {
              include: { dispatch: true },
            },
          },
        },
        dispatches: {
          orderBy: { dispatchDate: "desc" },
          include: {
            dispatchItems: { include: { orderItem: { include: { product: true } } } },
            createdBy: { select: { name: true } },
          },
        },
      },
    });

    await invalidateReadCaches();

    return NextResponse.json(order);
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to update order";
    return NextResponse.json({ error: message }, { status });
  }
}
