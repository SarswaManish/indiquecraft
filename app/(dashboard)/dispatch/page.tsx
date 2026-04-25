"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";
import { Send, CheckCircle, Package, ArrowRight } from "lucide-react";
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

const READY_PAGE_SIZE = DEFAULT_PAGE_SIZE;
const DISPATCH_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export default function DispatchPage() {
  const router = useRouter();
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [readyTotal, setReadyTotal] = useState(0);
  const [recentDispatches, setRecentDispatches] = useState<DispatchRecord[]>([]);
  const [dispatchTotal, setDispatchTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dispatchPage, setDispatchPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      const [ordersRes, dispatchRes] = await Promise.all([
        fetch(
          `/api/orders?status=READY_TO_DISPATCH&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${READY_PAGE_SIZE}`
        ),
        fetch(`/api/dispatch?page=${dispatchPage}&limit=${DISPATCH_PAGE_SIZE}`),
      ]);
      const [ordersData, dispatchData] = await Promise.all([ordersRes.json(), dispatchRes.json()]);
      if (!active) return;
      setReadyOrders(ordersData.orders || []);
      setReadyTotal(ordersData.total || 0);
      setRecentDispatches(dispatchData.dispatches || []);
      setDispatchTotal(dispatchData.total || 0);
      setLoading(false);
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [debouncedSearch, page, dispatchPage]);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Ready to Dispatch" value={readyTotal} icon={Package} color="green" />
        <StatCard title="Dispatched Today" value={dispatchedToday} icon={Send} color="blue" />
        <StatCard title="Recent Dispatches" value={dispatchTotal} icon={CheckCircle} color="gray" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Ready to Dispatch ({readyTotal})</h2>
          <SearchInput
            placeholder="Search order #, customer…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-56"
          />
        </div>
        <DataTable
          columns={readyColumns}
          data={readyOrders}
          loading={loading}
          emptyMessage="No orders ready to dispatch"
          onRowClick={(row) => router.push(`/orders/${(row as ReadyOrder).id}`)}
          renderCard={(row) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{row.orderNumber}</p>
                  <p className="text-sm text-slate-500">{row.customer.partyName}</p>
                </div>
                <OrderStatusBadge status={row.status as never} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Due</p>
                  <p className="mt-1 text-slate-700">{formatDate(row.promisedDeliveryDate)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Items</p>
                  <p className="mt-1 text-slate-700">{row._count.orderItems}</p>
                </div>
              </div>
              <Link href={`/orders/${row.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
                Open dispatch sheet
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        />
        <Pagination page={page} limit={READY_PAGE_SIZE} total={readyTotal} onPageChange={setPage} />
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
          renderCard={(row) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{row.order.orderNumber}</p>
                  <p className="text-sm text-slate-500">{row.order.customer.partyName}</p>
                </div>
                <span className={row.isPartial ? "text-xs font-semibold text-orange-600" : "text-xs font-semibold text-emerald-600"}>
                  {row.isPartial ? "Partial" : "Full"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Date</p>
                  <p className="mt-1 text-slate-700">{formatDate(row.dispatchDate)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Via</p>
                  <p className="mt-1 text-slate-700">{row.transporter || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tracking</p>
                  <p className="mt-1 text-slate-700">{row.trackingNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">By</p>
                  <p className="mt-1 text-slate-700">{row.createdBy?.name || "—"}</p>
                </div>
              </div>
            </div>
          )}
        />
        <Pagination
          page={dispatchPage}
          limit={DISPATCH_PAGE_SIZE}
          total={dispatchTotal}
          onPageChange={setDispatchPage}
        />
      </div>
    </div>
  );
}
