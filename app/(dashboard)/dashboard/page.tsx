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
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { formatDate, delayedDays } from "@/lib/utils";
import Link from "next/link";

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  const role = session?.user?.role;
  const showOwner = ["ADMIN", "OWNER"].includes(role || "");
  const showPurchase = ["ADMIN", "OWNER", "PURCHASE_COORDINATOR"].includes(role || "");
  const showProduction = ["ADMIN", "OWNER", "PRODUCTION_MANAGER"].includes(role || "");
  const showDispatch = ["ADMIN", "OWNER", "DISPATCH_MANAGER"].includes(role || "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {session?.user?.name}
        </p>
      </div>

      {/* Owner / Top-level KPIs */}
      {showOwner && data.owner && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
              <CardTitle>Delayed Orders</CardTitle>
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
              <div className="px-6 py-3 border-t border-gray-100">
                <Link href="/orders?status=DELAYED" className="text-xs text-indigo-600 hover:underline">
                  View all delayed orders →
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue vendor requests */}
        {data.owner && data.owner.overdueVRs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Overdue Vendor Requests</CardTitle>
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
              <div className="px-6 py-3 border-t border-gray-100">
                <Link href="/vendor-requests?status=DELAYED" className="text-xs text-indigo-600 hover:underline">
                  View all vendor requests →
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
