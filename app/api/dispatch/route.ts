import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

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

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { orderItems: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const totalItems = order.orderItems.length;
  const dispatchedItemIds = parsed.data.items.map((i) => i.orderItemId);
  const isPartial = dispatchedItemIds.length < totalItems;

  const dispatch = await db.dispatch.create({
    data: {
      orderId: parsed.data.orderId,
      dispatchDate: parsed.data.dispatchDate ? new Date(parsed.data.dispatchDate) : new Date(),
      transporter: parsed.data.transporter,
      trackingNumber: parsed.data.trackingNumber,
      remarks: parsed.data.remarks,
      isPartial,
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

  // Update order status
  const newStatus = isPartial ? "DISPATCHED" : "DISPATCHED";
  await db.order.update({
    where: { id: parsed.data.orderId },
    data: { status: newStatus },
  });

  return NextResponse.json(dispatch, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const date = searchParams.get("date");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

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
