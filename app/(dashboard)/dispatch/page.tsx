"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { Send, CheckCircle, Package } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";

interface ReadyOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  promisedDeliveryDate: string | null;
  status: string;
  customer: { partyName: string; phone: string };
  _count: { orderItems: number };
}

interface DispatchRecord {
  id: string;
  dispatchDate: string;
  transporter: string | null;
  trackingNumber: string | null;
  isPartial: boolean;
  order: { orderNumber: string; customer: { partyName: string } };
  createdBy: { name: string } | null;
}

export default function DispatchPage() {
  const router = useRouter();
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [recentDispatches, setRecentDispatches] = useState<DispatchRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      const [ordersRes, dispatchRes] = await Promise.all([
        fetch(`/api/orders?status=READY_TO_DISPATCH&search=${encodeURIComponent(debouncedSearch)}&limit=50`),
        fetch("/api/dispatch?limit=20"),
      ]);
      const [ordersData, dispatchData] = await Promise.all([ordersRes.json(), dispatchRes.json()]);
      if (!active) return;
      setReadyOrders(ordersData.orders || []);
      setRecentDispatches(dispatchData.dispatches || []);
      setLoading(false);
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  const today = new Date().toISOString().split("T")[0];
  const dispatchedToday = recentDispatches.filter(d => d.dispatchDate.startsWith(today)).length;

  const readyColumns = [
    { key: "orderNumber", header: "Order #", render: (row: ReadyOrder) => (
      <span className="font-mono font-medium text-indigo-700">{row.orderNumber}</span>
    )},
    { key: "customer", header: "Customer", render: (row: ReadyOrder) => (
      <div>
        <p className="font-medium">{row.customer.partyName}</p>
        <p className="text-xs text-gray-400">{row.customer.phone}</p>
      </div>
    )},
    { key: "dueDate", header: "Due", render: (row: ReadyOrder) => formatDate(row.promisedDeliveryDate) },
    { key: "items", header: "Items", render: (row: ReadyOrder) => row._count.orderItems },
    { key: "status", header: "Status", render: (row: ReadyOrder) => <OrderStatusBadge status={row.status as never} /> },
    { key: "action", header: "", render: (row: ReadyOrder) => (
      <Link href={`/orders/${row.id}`} className="text-indigo-600 text-sm hover:underline">
        Dispatch →
      </Link>
    )},
  ];

  const dispatchColumns = [
    { key: "dispatchDate", header: "Date", render: (row: DispatchRecord) => formatDate(row.dispatchDate) },
    { key: "order", header: "Order", render: (row: DispatchRecord) => (
      <span className="font-mono font-medium">{row.order.orderNumber}</span>
    )},
    { key: "customer", header: "Customer", render: (row: DispatchRecord) => row.order.customer.partyName },
    { key: "transporter", header: "Via", render: (row: DispatchRecord) => row.transporter || "—" },
    { key: "tracking", header: "Tracking", render: (row: DispatchRecord) => row.trackingNumber || "—" },
    { key: "type", header: "Type", render: (row: DispatchRecord) => (
      row.isPartial ? <span className="text-orange-600 text-xs font-medium">Partial</span>
        : <span className="text-green-600 text-xs font-medium">Full</span>
    )},
    { key: "by", header: "By", render: (row: DispatchRecord) => row.createdBy?.name || "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dispatch" description="Manage order dispatches" />

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Ready to Dispatch" value={readyOrders.length} icon={Package} color="green" />
        <StatCard title="Dispatched Today" value={dispatchedToday} icon={Send} color="blue" />
        <StatCard title="Total This Week" value={recentDispatches.length} icon={CheckCircle} color="gray" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Ready to Dispatch ({readyOrders.length})</h2>
          <SearchInput
            placeholder="Search order #, customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
        <DataTable
          columns={readyColumns}
          data={readyOrders}
          loading={loading}
          emptyMessage="No orders ready to dispatch"
          onRowClick={(row) => router.push(`/orders/${(row as ReadyOrder).id}`)}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Dispatches</h2>
        </div>
        <DataTable
          columns={dispatchColumns}
          data={recentDispatches}
          loading={loading}
          emptyMessage="No dispatches yet"
        />
      </div>
    </div>
  );
}
