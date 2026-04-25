import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "order-aging";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter =
    from && to
      ? { gte: new Date(from), lte: new Date(to) }
      : undefined;

  if (type === "order-aging") {
    const orders = await db.order.findMany({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        ...(dateFilter ? { orderDate: dateFilter } : {}),
      },
      include: { customer: { select: { partyName: true } } },
      orderBy: { orderDate: "asc" },
    });
    return NextResponse.json({ orders });
  }

  if (type === "vendor-pending") {
    const requests = await db.vendorRequest.findMany({
      where: {
        status: { notIn: ["FULLY_RECEIVED", "CANCELLED"] },
        ...(dateFilter ? { requestDate: dateFilter } : {}),
      },
      include: {
        vendor: { select: { name: true } },
        vendorRequestItems: true,
      },
      orderBy: { expectedArrivalDate: "asc" },
    });
    return NextResponse.json({ requests });
  }

  if (type === "delayed-orders") {
    const today = new Date();
    const orders = await db.order.findMany({
      where: {
        promisedDeliveryDate: { lt: today },
        status: { notIn: ["COMPLETED", "CANCELLED", "DISPATCHED"] },
      },
      include: { customer: { select: { partyName: true } } },
      orderBy: { promisedDeliveryDate: "asc" },
    });
    return NextResponse.json({ orders });
  }

  if (type === "raw-material-pending") {
    const items = await db.orderItem.findMany({
      where: {
        rawMaterialRequired: true,
        productionStage: "WAITING_MATERIAL",
      },
      include: {
        product: { select: { name: true, sku: true } },
        order: {
          include: { customer: { select: { partyName: true } } },
        },
        vendorRequestItems: {
          include: { vendorRequest: { include: { vendor: { select: { name: true } } } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ items });
  }

  if (type === "dispatch-summary") {
    const dispatches = await db.dispatch.findMany({
      where: dateFilter ? { dispatchDate: dateFilter } : {},
      include: {
        order: { include: { customer: { select: { partyName: true } } } },
        dispatchItems: { include: { orderItem: { include: { product: true } } } },
        createdBy: { select: { name: true } },
      },
      orderBy: { dispatchDate: "desc" },
    });
    return NextResponse.json({ dispatches });
  }

  if (type === "customer-history") {
    const customerId = searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 });
    }
    const orders = await db.order.findMany({
      where: { customerId },
      include: {
        orderItems: { include: { product: { select: { name: true } } } },
        dispatches: true,
      },
      orderBy: { orderDate: "desc" },
    });
    return NextResponse.json({ orders });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
