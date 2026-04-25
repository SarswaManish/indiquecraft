import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { getDashboardSectionsForRole } from "@/lib/rbac";
import { getDashboardCache, setDashboardCache } from "@/lib/server-cache";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as Role;
  const cached = await getDashboardCache<Record<string, unknown>>(role);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "x-cache": "redis-hit",
      },
    });
  }

  const sections = new Set(getDashboardSectionsForRole(role));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const response: Record<string, unknown> = {};

  if (sections.has("owner")) {
    const [
      totalActiveOrders,
      delayedOrders,
      rawMaterialPendingOrders,
      readyToDispatch,
      overdueVendorRequests,
      overdueVRs,
      recentDelayedOrders,
    ] = await Promise.all([
      db.order.count({
        where: { status: { notIn: ["COMPLETED", "CANCELLED", "DISPATCHED"] } },
      }),
      db.order.count({
        where: {
          promisedDeliveryDate: { lt: today },
          status: { notIn: ["COMPLETED", "CANCELLED", "DISPATCHED"] },
        },
      }),
      db.order.count({ where: { status: "RAW_MATERIAL_PENDING" } }),
      db.order.count({ where: { status: "READY_TO_DISPATCH" } }),
      db.vendorRequest.count({
        where: {
          expectedArrivalDate: { lt: today },
          status: { notIn: ["FULLY_RECEIVED", "CANCELLED"] },
        },
      }),
      db.vendorRequest.findMany({
        where: {
          expectedArrivalDate: { lt: today },
          status: { notIn: ["FULLY_RECEIVED", "CANCELLED"] },
        },
        include: { vendor: { select: { name: true } } },
        orderBy: { expectedArrivalDate: "asc" },
        take: 5,
      }),
      db.order.findMany({
        where: {
          promisedDeliveryDate: { lt: today },
          status: { notIn: ["COMPLETED", "CANCELLED", "DISPATCHED"] },
        },
        include: { customer: { select: { partyName: true } } },
        orderBy: { promisedDeliveryDate: "asc" },
        take: 5,
      }),
    ]);

    response.owner = {
      totalActiveOrders,
      delayedOrders,
      rawMaterialPendingOrders,
      readyToDispatch,
      overdueVendorRequests,
      recentDelayedOrders,
      overdueVRs,
    };
  }

  if (sections.has("purchase")) {
    const [
      pendingVendorRequests,
      overdueVendorRequests,
      arrivingToday,
      partiallyReceived,
    ] = await Promise.all([
      db.vendorRequest.count({
        where: { status: { in: ["REQUESTED", "FOLLOW_UP_PENDING", "CONFIRMED"] } },
      }),
      db.vendorRequest.count({
        where: {
          expectedArrivalDate: { lt: today },
          status: { notIn: ["FULLY_RECEIVED", "CANCELLED"] },
        },
      }),
      db.vendorRequest.count({
        where: {
          expectedArrivalDate: { gte: today, lte: todayEnd },
          status: { notIn: ["FULLY_RECEIVED", "CANCELLED"] },
        },
      }),
      db.vendorRequest.count({ where: { status: "PARTIALLY_RECEIVED" } }),
    ]);

    response.purchase = {
      pendingVendorRequests,
      overdueVendorRequests,
      arrivingToday,
      partiallyReceived,
    };
  }

  if (sections.has("production")) {
    const [
      waitingMaterialItems,
      inProductionItems,
      inPlatingItems,
      inFinishingItems,
      packedItems,
    ] = await Promise.all([
      db.orderItem.count({ where: { productionStage: "WAITING_MATERIAL" } }),
      db.orderItem.count({ where: { productionStage: "MANUFACTURING" } }),
      db.orderItem.count({ where: { productionStage: "PLATING" } }),
      db.orderItem.count({ where: { productionStage: "FINISHING" } }),
      db.orderItem.count({ where: { productionStage: "PACKING" } }),
    ]);

    response.production = {
      waitingMaterialItems,
      inProductionItems,
      inPlatingItems,
      inFinishingItems,
      packedItems,
    };
  }

  if (sections.has("dispatch")) {
    const [readyToDispatchOrders, dispatchedToday] = await Promise.all([
      db.order.count({ where: { status: "READY_TO_DISPATCH" } }),
      db.dispatch.count({
        where: { dispatchDate: { gte: today, lte: todayEnd } },
      }),
    ]);

    response.dispatch = {
      readyToDispatchOrders,
      dispatchedToday,
    };
  }

  await setDashboardCache(role, response);

  return NextResponse.json(response, {
    headers: {
      "x-cache": "redis-miss",
    },
  });
}
