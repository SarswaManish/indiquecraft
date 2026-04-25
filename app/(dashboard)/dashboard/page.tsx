"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ShoppingCart,
  AlertTriangle,
  Clock,
  Package,
  Truck,
  CheckCircle,
  Factory,
  Send,
  ArrowRight,
  FilePlus2,
  Users,
  Boxes,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { formatDate, delayedDays } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardData {
  owner?: {
    totalActiveOrders: number;
    delayedOrders: number;
    rawMaterialPendingOrders: number;
    readyToDispatch: number;
    overdueVendorRequests: number;
    recentDelayedOrders: Array<{
      id: string;
      orderNumber: string;
      promisedDeliveryDate: string | null;
      status: string;
      customer: { partyName: string };
    }>;
    overdueVRs: Array<{
      id: string;
      requestNumber: string;
      expectedArrivalDate: string | null;
      vendor: { name: string };
    }>;
  };
  purchase?: {
    pendingVendorRequests: number;
    overdueVendorRequests: number;
    arrivingToday: number;
    partiallyReceived: number;
  };
  production?: {
    waitingMaterialItems: number;
    inProductionItems: number;
    inPlatingItems: number;
    inFinishingItems: number;
    packedItems: number;
  };
  dispatch?: {
    readyToDispatchOrders: number;
    dispatchedToday: number;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-white/70" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const role = session?.user?.role;
  const showOwner = ["ADMIN", "OWNER"].includes(role || "");
  const showPurchase = ["ADMIN", "OWNER", "PURCHASE_COORDINATOR"].includes(role || "");
  const showProduction = ["ADMIN", "OWNER", "PRODUCTION_MANAGER"].includes(role || "");
  const showDispatch = ["ADMIN", "OWNER", "DISPATCH_MANAGER"].includes(role || "");
  const urgentAlerts = [
    {
      label: "Delayed orders",
      value: data.owner?.delayedOrders ?? 0,
      href: "/orders?status=DELAYED",
      tone: "text-red-600 bg-red-50 border-red-100",
    },
    {
      label: "Material blocked",
      value: data.owner?.rawMaterialPendingOrders ?? 0,
      href: "/orders?status=RAW_MATERIAL_PENDING",
      tone: "text-amber-700 bg-amber-50 border-amber-100",
    },
    {
      label: "Vendor follow-ups",
      value: data.purchase?.overdueVendorRequests ?? data.owner?.overdueVendorRequests ?? 0,
      href: "/vendor-requests?status=DELAYED",
      tone: "text-orange-700 bg-orange-50 border-orange-100",
    },
    {
      label: "Ready to ship",
      value: data.dispatch?.readyToDispatchOrders ?? data.owner?.readyToDispatch ?? 0,
      href: "/dispatch",
      tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
    },
  ].filter((item) => item.value > 0);

  const quickActions = [
    {
      label: "Create order",
      description: "Capture a new retail or wholesale order",
      href: "/orders/new",
      icon: FilePlus2,
      visible: true,
    },
    {
      label: "New vendor request",
      description: "Raise material requirement against pending demand",
      href: "/vendor-requests/new",
      icon: Truck,
      visible: showPurchase || showOwner,
    },
    {
      label: "Check production queue",
      description: "See what is blocked, running, or ready for finishing",
      href: "/production",
      icon: Factory,
      visible: showProduction || role === "ORDER_MANAGER",
    },
    {
      label: "Maintain masters",
      description: "Clean products, vendors, and customer records",
      href: "/products",
      icon: Boxes,
      visible: true,
    },
    {
      label: "Customer records",
      description: "Edit parties and archived customer entries",
      href: "/customers",
      icon: Users,
      visible: true,
    },
  ].filter((item) => item.visible);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92)),radial-gradient(circle_at_top_right,rgba(59,130,246,0.4),transparent_35%)] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200/80">
              Today&apos;s control room
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back, {session?.user?.name?.split(" ")[0] || "team"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Track delayed orders, unblock raw material shortages, and move work to dispatch
              without jumping across screens.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {urgentAlerts.length > 0 ? (
                urgentAlerts.map((alert) => (
                  <Link
                    key={alert.label}
                    href={alert.href}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${alert.tone}`}
                  >
                    <span>{alert.label}</span>
                    <span>{alert.value}</span>
                  </Link>
                ))
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                  <CheckCircle size={14} />
                  No urgent blockers right now
                </div>
              )}
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-2xl">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-2xl border border-white/10 bg-white/8 p-4 transition hover:border-white/20 hover:bg-white/12"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-white/12 p-3 text-sky-100">
                      <Icon size={18} />
                    </div>
                    <ArrowRight
                      size={16}
                      className="mt-1 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-white"
                    />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">{action.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{action.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Owner / Top-level KPIs */}
      {showOwner && data.owner && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Overview
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Active Orders"
              value={data.owner.totalActiveOrders}
              icon={ShoppingCart}
              color="blue"
            />
            <StatCard
              title="Delayed Orders"
              value={data.owner.delayedOrders}
              icon={AlertTriangle}
              color="red"
            />
            <StatCard
              title="Material Pending"
              value={data.owner.rawMaterialPendingOrders}
              icon={Package}
              color="yellow"
            />
            <StatCard
              title="Ready to Dispatch"
              value={data.owner.readyToDispatch}
              icon={CheckCircle}
              color="green"
            />
          </div>
        </section>
      )}

      {/* Purchase KPIs */}
      {showPurchase && data.purchase && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Purchase / Vendor
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Pending Requests"
              value={data.purchase.pendingVendorRequests}
              icon={Truck}
              color="blue"
            />
            <StatCard
              title="Overdue Requests"
              value={data.purchase.overdueVendorRequests}
              icon={AlertTriangle}
              color="red"
            />
            <StatCard
              title="Arriving Today"
              value={data.purchase.arrivingToday}
              icon={Clock}
              color="green"
            />
            <StatCard
              title="Partially Received"
              value={data.purchase.partiallyReceived}
              icon={Package}
              color="orange"
            />
          </div>
        </section>
      )}

      {/* Production KPIs */}
      {showProduction && data.production && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Production Floor
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Waiting Material"
              value={data.production.waitingMaterialItems}
              icon={Package}
              color="yellow"
            />
            <StatCard
              title="Manufacturing"
              value={data.production.inProductionItems}
              icon={Factory}
              color="blue"
            />
            <StatCard
              title="Plating"
              value={data.production.inPlatingItems}
              icon={Factory}
              color="purple"
            />
            <StatCard
              title="Finishing"
              value={data.production.inFinishingItems}
              icon={Factory}
              color="orange"
            />
            <StatCard
              title="Packing"
              value={data.production.packedItems}
              icon={Package}
              color="green"
            />
          </div>
        </section>
      )}

      {/* Dispatch KPIs */}
      {showDispatch && data.dispatch && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Dispatch
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Ready to Dispatch"
              value={data.dispatch.readyToDispatchOrders}
              icon={Send}
              color="green"
            />
            <StatCard
              title="Dispatched Today"
              value={data.dispatch.dispatchedToday}
              icon={CheckCircle}
              color="blue"
            />
          </div>
        </section>
      )}

      {/* Detail tables */}
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        {/* Delayed orders */}
        {data.owner && data.owner.recentDelayedOrders.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Delayed Orders</CardTitle>
                <Link href="/orders?status=DELAYED">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {data.owner.recentDelayedOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{order.customer.partyName}</p>
                    </div>
                    <div className="text-right">
                      <OrderStatusBadge status={order.status as never} />
                      <p className="text-xs text-red-600 mt-1">
                        {delayedDays(order.promisedDeliveryDate)}d overdue
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue vendor requests */}
        {data.owner && data.owner.overdueVRs.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Overdue Vendor Requests</CardTitle>
                <Link href="/vendor-requests?status=DELAYED">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {data.owner.overdueVRs.map((vr) => (
                  <Link
                    key={vr.id}
                    href={`/vendor-requests/${vr.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{vr.requestNumber}</p>
                      <p className="text-xs text-gray-500">{vr.vendor.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600">
                        Expected: {formatDate(vr.expectedArrivalDate)}
                      </p>
                      <p className="text-xs text-red-600 font-medium">
                        {delayedDays(vr.expectedArrivalDate)}d late
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!showOwner && quickActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {quickActions.slice(0, 4).map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="rounded-xl bg-white p-2 text-slate-700 shadow-sm ring-1 ring-slate-200">
                        <Icon size={16} />
                      </div>
                      <ArrowRight size={15} className="text-slate-400" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{action.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
