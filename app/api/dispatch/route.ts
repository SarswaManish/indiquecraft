import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { recomputeAndPersistOrderStatus } from "@/lib/order-workflow";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

function createHttpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

const dispatchItemSchema = z.object({
  orderItemId: z.string().min(1),
  qtyDispatched: z.number().int().min(1),
});

const createDispatchSchema = z.object({
  orderId: z.string().min(1),
  dispatchDate: z.string().optional(),
  transporter: z.string().optional(),
  trackingNumber: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(dispatchItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createDispatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const dispatch = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: parsed.data.orderId },
        include: {
          orderItems: {
            include: {
              dispatchItems: true,
            },
          },
        },
      });

      if (!order) {
        throw createHttpError("Order not found", 404);
      }

      const requestedOrderItemIds = parsed.data.items.map((item) => item.orderItemId);
      const uniqueOrderItemIds = new Set(requestedOrderItemIds);
      if (uniqueOrderItemIds.size !== requestedOrderItemIds.length) {
        throw createHttpError("Duplicate order items are not allowed in one dispatch");
      }

      const orderItemsById = new Map(order.orderItems.map((item) => [item.id, item]));

      for (const dispatchItem of parsed.data.items) {
        const orderItem = orderItemsById.get(dispatchItem.orderItemId);
        if (!orderItem) {
          throw createHttpError("Dispatch item does not belong to the selected order");
        }

        if (orderItem.productionStage !== "COMPLETED") {
          throw createHttpError(`Order item ${orderItem.productId} is not ready for dispatch`);
        }

        const alreadyDispatchedQty = orderItem.dispatchItems.reduce(
          (total, item) => total + item.qtyDispatched,
          0
        );
        const remainingQty = orderItem.quantity - alreadyDispatchedQty;

        if (remainingQty <= 0) {
          throw createHttpError("This order item has already been fully dispatched");
        }

        if (dispatchItem.qtyDispatched > remainingQty) {
          throw createHttpError(
            `Cannot dispatch ${dispatchItem.qtyDispatched} units. Only ${remainingQty} remaining for this item.`
          );
        }
      }

      const dispatch = await tx.dispatch.create({
        data: {
          orderId: parsed.data.orderId,
          dispatchDate: parsed.data.dispatchDate ? new Date(parsed.data.dispatchDate) : new Date(),
          transporter: parsed.data.transporter,
          trackingNumber: parsed.data.trackingNumber,
          remarks: parsed.data.remarks,
          isPartial: true,
          createdById: session.user.id,
          dispatchItems: {
            create: parsed.data.items.map((item) => ({
              orderItemId: item.orderItemId,
              qtyDispatched: item.qtyDispatched,
            })),
          },
        },
        include: { dispatchItems: true },
      });

      const nextStatus = await recomputeAndPersistOrderStatus(tx, parsed.data.orderId);
      const isPartial = nextStatus !== "DISPATCHED";

      return tx.dispatch.update({
        where: { id: dispatch.id },
        data: { isPartial },
        include: { dispatchItems: true },
      });
    });

    return NextResponse.json(dispatch, { status: 201 });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to create dispatch";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const date = searchParams.get("date");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (orderId) where.orderId = orderId;
  if (date) {
    const d = new Date(date);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    where.dispatchDate = { gte: d, lt: nextDay };
  }

  const [dispatches, total] = await Promise.all([
    db.dispatch.findMany({
      where,
      orderBy: { dispatchDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        order: { include: { customer: { select: { partyName: true } } } },
        dispatchItems: { include: { orderItem: { include: { product: true } } } },
        createdBy: { select: { name: true } },
      },
    }),
    db.dispatch.count({ where }),
  ]);

  return NextResponse.json({ dispatches, total });
}
