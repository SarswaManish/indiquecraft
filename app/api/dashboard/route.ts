import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalActiveOrders,
    delayedOrders,
    rawMaterialPendingOrders,
    readyToDispatch,
    overdueVendorRequests,
    pendingVendorRequests,
    arrivingToday,
    partiallyReceived,
    waitingMaterialItems,
    inProductionItems,
    inPlatingItems,
    inFinishingItems,
    packedItems,
    readyToDispatchOrders,
    dispatchedToday,
  ] = await Promise.all([
    // Active orders (not completed/cancelled)
    db.order.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED", "DISPATCHED"] } },
    }),

    // Delayed orders (past promised delivery date and not done)
    db.order.count({
      where: {
        promisedDeliveryDate: { lt: today },
        status: { notIn: ["COMPLETED", "CANCELLED", "DISPATCHED"] },
      },
    }),

    // Blocked by raw material
    db.order.count({ where: { status: "RAW_MATERIAL_PENDING" } }),

    // Ready to dispatch
    db.order.count({ where: { status: "READY_TO_DISPATCH" } }),

    // Overdue vendor requests (expected arrival past, not fully received)
    db.vendorRequest.count({
      where: {
        expectedArrivalDate: { lt: today },
        status: { notIn: ["FULLY_RECEIVED", "CANCELLED"] },
      },
    }),

    // Pending vendor requests
    db.vendorRequest.count({
      where: { status: { in: ["REQUESTED", "FOLLOW_UP_PENDING", "CONFIRMED"] } },
    }),

    // Arriving today
    db.vendorRequest.count({
      where: {
        expectedArrivalDate: { gte: today, lte: todayEnd },
        status: { notIn: ["FULLY_RECEIVED", "CANCELLED"] },
      },
    }),

    // Partially received
    db.vendorRequest.count({ where: { status: "PARTIALLY_RECEIVED" } }),

    // Production: waiting material
    db.orderItem.count({ where: { productionStage: "WAITING_MATERIAL" } }),

    // In production (manufacturing)
    db.orderItem.count({ where: { productionStage: "MANUFACTURING" } }),

    // In plating
    db.orderItem.count({ where: { productionStage: "PLATING" } }),

    // In finishing
    db.orderItem.count({ where: { productionStage: "FINISHING" } }),

    // Packing
    db.orderItem.count({ where: { productionStage: "PACKING" } }),

    // Ready to dispatch orders
    db.order.count({ where: { status: "READY_TO_DISPATCH" } }),

    // Dispatched today
    db.dispatch.count({
      where: { dispatchDate: { gte: today, lte: todayEnd } },
    }),
  ]);

  // Top delayed vendors
  const overdueVRs = await db.vendorRequest.findMany({
    where: {
      expectedArrivalDate: { lt: today },
      status: { notIn: ["FULLY_RECEIVED", "CANCELLED"] },
    },
    include: { vendor: { select: { name: true } } },
    orderBy: { expectedArrivalDate: "asc" },
    take: 5,
  });

  // Recent delayed orders
  const recentDelayedOrders = await db.order.findMany({
    where: {
      promisedDeliveryDate: { lt: today },
      status: { notIn: ["COMPLETED", "CANCELLED", "DISPATCHED"] },
    },
    include: { customer: { select: { partyName: true } } },
    orderBy: { promisedDeliveryDate: "asc" },
    take: 5,
  });

  return NextResponse.json({
    owner: {
      totalActiveOrders,
      delayedOrders,
      rawMaterialPendingOrders,
      readyToDispatch,
      overdueVendorRequests,
      recentDelayedOrders,
      overdueVRs,
    },
    purchase: {
      pendingVendorRequests,
      overdueVendorRequests,
      arrivingToday,
      partiallyReceived,
    },
    production: {
      waitingMaterialItems,
      inProductionItems,
      inPlatingItems,
      inFinishingItems,
      packedItems,
    },
    dispatch: {
      readyToDispatchOrders,
      dispatchedToday,
    },
  });
}
