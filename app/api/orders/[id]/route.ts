import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { OrderPriority, OrderSource, OrderStatus } from "@prisma/client";

const updateSchema = z.object({
  promisedDeliveryDate: z.string().optional(),
  source: z.nativeEnum(OrderSource).optional(),
  priority: z.nativeEnum(OrderPriority).optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  notes: z.string().optional(),
});

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

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.promisedDeliveryDate) {
    data.promisedDeliveryDate = new Date(parsed.data.promisedDeliveryDate);
  }

  const order = await db.order.update({ where: { id }, data });
  return NextResponse.json(order);
}
