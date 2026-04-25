import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { z } from "zod";
import { OrderStatus, Prisma, ProductionStage, Role } from "@prisma/client";
import { recomputeAndPersistOrderStatus } from "@/lib/order-workflow";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import {
  getProductionQueueCache,
  invalidateReadCaches,
  setProductionQueueCache,
} from "@/lib/server-cache";

const stageUpdateSchema = z.object({
  orderItemId: z.string().min(1),
  stage: z.nativeEnum(ProductionStage),
  assignedPerson: z.string().optional(),
  remarks: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = stageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonNoStore({ error: parsed.error.flatten() }, { status: 400 });
  }

  const log = await db.$transaction(async (tx) => {
    const orderItem = await tx.orderItem.findUnique({
      where: { id: parsed.data.orderItemId },
      select: { id: true, orderId: true },
    });
    if (!orderItem) {
      throw new Error("Order item not found");
    }

    await tx.orderItem.update({
      where: { id: parsed.data.orderItemId },
      data: { productionStage: parsed.data.stage },
    });

    const log = await tx.productionLog.create({
      data: {
        orderItemId: parsed.data.orderItemId,
        stage: parsed.data.stage,
        updatedById: session.user.id,
        assignedPerson: parsed.data.assignedPerson,
        remarks: parsed.data.remarks,
      },
    });

    await recomputeAndPersistOrderStatus(tx, orderItem.orderId);
    return log;
  });

  await invalidateReadCaches();

  return jsonNoStore(log, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as Role;

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const orderId = searchParams.get("orderId");
  const orderItemId = searchParams.get("orderItemId");
  const stage = searchParams.get("stage");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE));
  const activeOrderStatuses: OrderStatus[] = [
    "RAW_MATERIAL_PENDING",
    "MATERIAL_RECEIVED",
    "IN_PRODUCTION",
    "FINISHING",
    "PACKING",
    "READY_TO_DISPATCH",
  ];

  if (view === "queue") {
    const querySignature = searchParams.toString() || "view=queue";
    const cached = await getProductionQueueCache<Record<string, unknown>>(role, querySignature);
    if (cached) {
      return jsonNoStore(cached, {
        headers: {
          "x-cache": "redis-hit",
        },
      });
    }

    const where: Prisma.OrderItemWhereInput = {
      order: {
        status: {
          in: activeOrderStatuses,
        },
      },
      ...(stage ? { productionStage: stage as ProductionStage } : {}),
    };

    const [items, total, stageCounts] = await Promise.all([
      db.orderItem.findMany({
        where,
        orderBy: [
          { order: { promisedDeliveryDate: "asc" } },
          { updatedAt: "desc" },
        ],
        include: {
          product: { select: { name: true, sku: true } },
          vendorRequestItems: { select: { pendingQty: true } },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              priority: true,
              promisedDeliveryDate: true,
              customer: { select: { partyName: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.orderItem.count({ where }),
      db.orderItem.groupBy({
        by: ["productionStage"],
        where: {
          order: {
            status: {
              in: activeOrderStatuses,
            },
          },
        },
        _count: { productionStage: true },
      }),
    ]);

    const response = { items, total, page, limit, stageCounts };
    await setProductionQueueCache(role, querySignature, response);
    return jsonNoStore(response, {
      headers: {
        "x-cache": "redis-miss",
      },
    });
  }

  const where: Record<string, unknown> = {};
  if (orderId) {
    where.orderItem = { orderId };
  }
  if (orderItemId) where.orderItemId = orderItemId;

  const logs = await db.productionLog.findMany({
    where,
    orderBy: { loggedAt: "desc" },
    include: { updatedBy: { select: { name: true } } },
  });

  return jsonNoStore({ logs });
}
