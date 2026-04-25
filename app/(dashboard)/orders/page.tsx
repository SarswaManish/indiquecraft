"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { OrderStatusBadge, PriorityBadge } from "@/components/shared/status-badge";
import { formatDate, delayedDays } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { Plus, AlertTriangle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { OrderStatus, OrderPriority } from "@prisma/client";

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  promisedDeliveryDate: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  customer: { partyName: string; phone: string };
  _count: { orderItems: number };
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const priorityOptions = [
  { value: "", label: "All Priorities" },
  ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
];

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearch,
        status,
        priority,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (!active) return;
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setLoading(false);
    }

    void loadOrders();
    return () => {
      active = false;
    };
  }, [debouncedSearch, status, priority, page]);

  const columns = [
    {
      key: "orderNumber", header: "Order #",
      render: (row: Order) => (
        <span className="font-mono font-medium text-indigo-700">{row.orderNumber}</span>
      ),
    },
    {
      key: "customer", header: "Customer",
      render: (row: Order) => (
        <div>
          <p className="font-medium text-gray-900">{row.customer.partyName}</p>
          <p className="text-xs text-gray-400">{row.customer.phone}</p>
        </div>
      ),
    },
    { key: "orderDate", header: "Order Date", render: (row: Order) => formatDate(row.orderDate) },
    {
      key: "promisedDeliveryDate", header: "Due Date",
      render: (row: Order) => {
        if (!row.promisedDeliveryDate) return <span className="text-gray-400">—</span>;
        const days = delayedDays(row.promisedDeliveryDate);
        return (
          <div>
            <p>{formatDate(row.promisedDeliveryDate)}</p>
            {days > 0 && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle size={11} /> {days}d overdue
              </p>
            )}
          </div>
        );
      },
    },
    { key: "status", header: "Status", render: (row: Order) => <OrderStatusBadge status={row.status} /> },
    { key: "priority", header: "Priority", render: (row: Order) => <PriorityBadge priority={row.priority} /> },
    { key: "items", header: "Items", render: (row: Order) => (
      <span className="text-gray-500 text-sm">{row._count.orderItems}</span>
    )},
  ];

  return (
    <div>
      <PageHeader
        title={`Orders (${total})`}
        description="All customer orders"
        actions={
          <Link href="/orders/new">
            <Button><Plus size={16} /> New Order</Button>
          </Link>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <SearchInput
            placeholder="Search order #, customer…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-48"
          />
          <Select
            options={priorityOptions}
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          emptyMessage="No orders found"
          onRowClick={(row) => router.push(`/orders/${(row as Order).id}`)}
          renderCard={(row) => {
            const days = row.promisedDeliveryDate ? delayedDays(row.promisedDeliveryDate) : 0;
            return (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-indigo-700">{row.orderNumber}</p>
                    <p className="mt-1 font-medium text-slate-900">{row.customer.partyName}</p>
                    <p className="text-xs text-slate-400">{row.customer.phone}</p>
                  </div>
                  <OrderStatusBadge status={row.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Order date</p>
                    <p className="mt-1 text-slate-700">{formatDate(row.orderDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Due</p>
                    <p className="mt-1 text-slate-700">{formatDate(row.promisedDeliveryDate)}</p>
                    {days > 0 && <p className="text-xs font-medium text-red-600">{days}d overdue</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={row.priority} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {row._count.orderItems} items
                  </span>
                </div>
              </div>
            );
          }}
        />
        <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
