import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { ProductionStage } from "@prisma/client";
import { recomputeAndPersistOrderStatus } from "@/lib/order-workflow";

const stageUpdateSchema = z.object({
  orderItemId: z.string().min(1),
  stage: z.nativeEnum(ProductionStage),
  assignedPerson: z.string().optional(),
  remarks: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = stageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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

  return NextResponse.json(log, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const orderId = searchParams.get("orderId");
  const orderItemId = searchParams.get("orderItemId");
  const stage = searchParams.get("stage");

  if (view === "queue") {
    const items = await db.orderItem.findMany({
      where: {
        order: {
          status: {
            in: [
              "RAW_MATERIAL_PENDING",
              "MATERIAL_RECEIVED",
              "IN_PRODUCTION",
              "FINISHING",
              "PACKING",
              "READY_TO_DISPATCH",
            ],
          },
        },
        ...(stage ? { productionStage: stage as ProductionStage } : {}),
      },
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
      take: 200,
    });

    return NextResponse.json({ items });
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

  return NextResponse.json({ logs });
}
