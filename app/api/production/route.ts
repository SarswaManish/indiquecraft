import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { ProductionStage } from "@prisma/client";

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

  const orderItem = await db.orderItem.findUnique({
    where: { id: parsed.data.orderItemId },
    include: { order: true },
  });
  if (!orderItem) return NextResponse.json({ error: "Order item not found" }, { status: 404 });

  // Update production stage on the item
  await db.orderItem.update({
    where: { id: parsed.data.orderItemId },
    data: { productionStage: parsed.data.stage },
  });

  // Log it
  const log = await db.productionLog.create({
    data: {
      orderItemId: parsed.data.orderItemId,
      stage: parsed.data.stage,
      updatedById: session.user.id,
      assignedPerson: parsed.data.assignedPerson,
      remarks: parsed.data.remarks,
    },
  });

  // Auto-update order status based on all items' stages
  const allItems = await db.orderItem.findMany({
    where: { orderId: orderItem.orderId },
  });

  const stages = allItems.map((i) => i.productionStage);
  let newOrderStatus = orderItem.order.status;

  if (stages.every((s) => s === "COMPLETED")) {
    newOrderStatus = "READY_TO_DISPATCH";
  } else if (stages.some((s) => s === "PACKING")) {
    newOrderStatus = "PACKING";
  } else if (stages.some((s) => s === "FINISHING")) {
    newOrderStatus = "FINISHING";
  } else if (stages.some((s) => ["MANUFACTURING", "PLATING", "POLISHING"].includes(s))) {
    newOrderStatus = "IN_PRODUCTION";
  }

  if (newOrderStatus !== orderItem.order.status) {
    await db.order.update({
      where: { id: orderItem.orderId },
      data: { status: newOrderStatus },
    });
  }

  return NextResponse.json(log, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const orderItemId = searchParams.get("orderItemId");

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
