import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { FinishType, OrderPriority, OrderSource, OrderStatus } from "@prisma/client";
import { generateOrderNumber } from "@/lib/utils";

const orderItemSchema = z.object({
  productId: z.string().min(1),
  size: z.string().optional(),
  quantity: z.number().int().min(1),
  finishType: z.nativeEnum(FinishType).default("PLAIN"),
  rawMaterialRequired: z.boolean().default(false),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  orderDate: z.string().optional(),
  promisedDeliveryDate: z.string().optional(),
  source: z.nativeEnum(OrderSource).default("PHONE"),
  priority: z.nativeEnum(OrderPriority).default("NORMAL"),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";
  const customerId = searchParams.get("customerId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customer: { partyName: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (status) where.status = status as OrderStatus;
  if (priority) where.priority = priority as OrderPriority;
  if (customerId) where.customerId = customerId;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { partyName: true, phone: true } },
        _count: { select: { orderItems: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, ...orderData } = parsed.data;

  // Generate sequential order number
  const count = await db.order.count();
  const orderNumber = generateOrderNumber(count + 1);

  // Determine if any item needs raw material
  const needsMaterial = items.some((i) => i.rawMaterialRequired);
  const initialStatus: OrderStatus = needsMaterial ? "RAW_MATERIAL_PENDING" : "NEW";

  const order = await db.order.create({
    data: {
      ...orderData,
      orderNumber,
      status: initialStatus,
      orderDate: orderData.orderDate ? new Date(orderData.orderDate) : new Date(),
      promisedDeliveryDate: orderData.promisedDeliveryDate
        ? new Date(orderData.promisedDeliveryDate)
        : undefined,
      orderItems: {
        create: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          finishType: item.finishType,
          rawMaterialRequired: item.rawMaterialRequired,
          notes: item.notes,
          productionStage: item.rawMaterialRequired ? "WAITING_MATERIAL" : "NOT_STARTED",
        })),
      },
    },
    include: {
      orderItems: true,
      customer: true,
    },
  });

  return NextResponse.json(order, { status: 201 });
}
