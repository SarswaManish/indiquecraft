import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProductionStage, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { getReportsCache, setReportsCache } from "@/lib/server-cache";

type ReportType =
  | "order-aging"
  | "delayed-orders"
  | "vendor-pending"
  | "raw-material-pending"
  | "dispatch-summary"
  | "customer-history";

function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as Role;

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "order-aging") as ReportType;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const { page, limit, skip } = getPagination(searchParams);
  const querySignature = searchParams.toString() || `type=${type}`;

  const cached = await getReportsCache<Record<string, unknown>>(role, querySignature);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "x-cache": "redis-hit",
      },
    });
  }

  const dateFilter =
    from && to
      ? { gte: new Date(from), lte: new Date(to) }
      : undefined;

  if (type === "order-aging") {
    const where: Prisma.OrderWhereInput = {
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      ...(dateFilter ? { orderDate: dateFilter } : {}),
    };

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: { customer: { select: { partyName: true } } },
        orderBy: { orderDate: "asc" },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    const response = {
      orders,
      meta: {
        total,
        page,
        limit,
        activeOrders: total,
      },
    };
    await setReportsCache(role, querySignature, response);
    return NextResponse.json(response, { headers: { "x-cache": "redis-miss" } });
  }

  if (type === "vendor-pending") {
    const where: Prisma.VendorRequestWhereInput = {
      status: { notIn: ["FULLY_RECEIVED", "CANCELLED"] },
      ...(dateFilter ? { requestDate: dateFilter } : {}),
    };

    const [requests, total, overdue] = await Promise.all([
      db.vendorRequest.findMany({
        where,
        include: {
          vendor: { select: { name: true } },
          vendorRequestItems: true,
        },
        orderBy: { expectedArrivalDate: "asc" },
        skip,
        take: limit,
      }),
      db.vendorRequest.count({ where }),
      db.vendorRequest.count({
        where: {
          ...where,
          expectedArrivalDate: { lt: new Date() },
        },
      }),
    ]);

    const response = {
      requests,
      meta: {
        total,
        page,
        limit,
        overdue,
      },
    };
    await setReportsCache(role, querySignature, response);
    return NextResponse.json(response, { headers: { "x-cache": "redis-miss" } });
  }

  if (type === "delayed-orders") {
    const today = new Date();
    const where: Prisma.OrderWhereInput = {
      promisedDeliveryDate: { lt: today },
      status: { notIn: ["COMPLETED", "CANCELLED", "DISPATCHED"] },
    };

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: { customer: { select: { partyName: true } } },
        orderBy: { promisedDeliveryDate: "asc" },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    const response = {
      orders,
      meta: {
        total,
        page,
        limit,
        overdue: total,
      },
    };
    await setReportsCache(role, querySignature, response);
    return NextResponse.json(response, { headers: { "x-cache": "redis-miss" } });
  }

  if (type === "raw-material-pending") {
    const where: Prisma.OrderItemWhereInput = {
      rawMaterialRequired: true,
      productionStage: ProductionStage.WAITING_MATERIAL,
    };

    const [items, total, withoutRequest] = await Promise.all([
      db.orderItem.findMany({
        where,
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
        skip,
        take: limit,
      }),
      db.orderItem.count({ where }),
      db.orderItem.count({
        where: {
          ...where,
          vendorRequestItems: { none: {} },
        },
      }),
    ]);

    const response = {
      items,
      meta: {
        total,
        page,
        limit,
        withoutRequest,
      },
    };
    await setReportsCache(role, querySignature, response);
    return NextResponse.json(response, { headers: { "x-cache": "redis-miss" } });
  }

  if (type === "dispatch-summary") {
    const where: Prisma.DispatchWhereInput = dateFilter ? { dispatchDate: dateFilter } : {};

    const [dispatches, total, partial] = await Promise.all([
      db.dispatch.findMany({
        where,
        include: {
          order: { include: { customer: { select: { partyName: true } } } },
          dispatchItems: { include: { orderItem: { include: { product: true } } } },
          createdBy: { select: { name: true } },
        },
        orderBy: { dispatchDate: "desc" },
        skip,
        take: limit,
      }),
      db.dispatch.count({ where }),
      db.dispatch.count({ where: { ...where, isPartial: true } }),
    ]);

    const response = {
      dispatches,
      meta: {
        total,
        page,
        limit,
        partial,
      },
    };
    await setReportsCache(role, querySignature, response);
    return NextResponse.json(response, { headers: { "x-cache": "redis-miss" } });
  }

  if (type === "customer-history") {
    const customerId = searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 });
    }

    const where: Prisma.OrderWhereInput = { customerId };

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          orderItems: { include: { product: { select: { name: true } } } },
          dispatches: true,
        },
        orderBy: { orderDate: "desc" },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    const response = {
      orders,
      meta: {
        total,
        page,
        limit,
      },
    };
    await setReportsCache(role, querySignature, response);
    return NextResponse.json(response, { headers: { "x-cache": "redis-miss" } });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
