import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { VendorRequestStatus } from "@prisma/client";
import { generateNextVendorRequestNumber } from "@/lib/document-numbers";
import { recomputeAndPersistOrderStatuses } from "@/lib/order-workflow";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

const requestItemSchema = z.object({
  orderItemId: z.string().min(1),
  materialName: z.string().min(1),
  requestedQty: z.number().int().min(1),
  notes: z.string().optional(),
});

const createSchema = z.object({
  vendorId: z.string().min(1),
  requestDate: z.string().optional(),
  expectedArrivalDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(requestItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const vendorId = searchParams.get("vendorId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { requestNumber: { contains: search, mode: "insensitive" } },
      { vendor: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (status) where.status = status as VendorRequestStatus;
  if (vendorId) where.vendorId = vendorId;

  const [requests, total] = await Promise.all([
    db.vendorRequest.findMany({
      where,
      orderBy: { requestDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        vendor: { select: { name: true, phone: true } },
        _count: { select: { vendorRequestItems: true } },
      },
    }),
    db.vendorRequest.count({ where }),
  ]);

  return NextResponse.json({ requests, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, ...vrData } = parsed.data;

  const vendorRequest = await db.$transaction(async (tx) => {
    const requestNumber = await generateNextVendorRequestNumber(tx);

    const createdVendorRequest = await tx.vendorRequest.create({
      data: {
        ...vrData,
        requestNumber,
        status: "REQUESTED",
        requestDate: vrData.requestDate ? new Date(vrData.requestDate) : new Date(),
        expectedArrivalDate: vrData.expectedArrivalDate
          ? new Date(vrData.expectedArrivalDate)
          : undefined,
        vendorRequestItems: {
          create: items.map((item) => ({
            orderItemId: item.orderItemId,
            materialName: item.materialName,
            requestedQty: item.requestedQty,
            pendingQty: item.requestedQty,
            receivedQty: 0,
            notes: item.notes,
          })),
        },
      },
      include: {
        vendorRequestItems: {
          include: {
            orderItem: {
              select: { orderId: true },
            },
          },
        },
      },
    });

    await recomputeAndPersistOrderStatuses(
      tx,
      createdVendorRequest.vendorRequestItems.map((item) => item.orderItem.orderId)
    );

    return tx.vendorRequest.findUniqueOrThrow({
      where: { id: createdVendorRequest.id },
      include: { vendorRequestItems: true, vendor: true },
    });
  });

  return NextResponse.json(vendorRequest, { status: 201 });
}
