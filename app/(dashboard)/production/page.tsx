"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ProductionStageBadge, OrderStatusBadge } from "@/components/shared/status-badge";
import { PRIORITY_COLORS, PRIORITY_LABELS, PRODUCTION_STAGE_LABELS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { OrderPriority, ProductionStage } from "@prisma/client";
import { Search } from "lucide-react";

interface ProductionItem {
  id: string;
  productionStage: ProductionStage;
  quantity: number;
  size: string | null;
  vendorRequestItems: Array<{ pendingQty: number }>;
  product: { name: string; sku: string };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    priority: OrderPriority;
    promisedDeliveryDate: string | null;
    customer: { partyName: string };
  };
}

const stageFilterOptions = [
  { value: "", label: "All Stages" },
  ...Object.entries(PRODUCTION_STAGE_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

export default function ProductionPage() {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadItems() {
      setLoading(true);
      const params = new URLSearchParams({ view: "queue" });
      if (stageFilter) {
        params.set("stage", stageFilter);
      }
      const res = await fetch(`/api/production?${params}`);
      const data = await res.json();

      if (!active) return;
      setItems(data.items || []);
      setLoading(false);
    }

    void loadItems();
    return () => {
      active = false;
    };
  }, [stageFilter]);

  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [
      item.product.name,
      item.product.sku,
      item.order.orderNumber,
      item.order.customer.partyName,
    ].some((value) => value.toLowerCase().includes(term));
  });

  const columns = [
    { key: "product", header: "Product", render: (row: ProductionItem) => (
      <div>
        <p className="font-medium">{row.product.name}</p>
        <p className="text-xs text-gray-400 font-mono">{row.product.sku}</p>
      </div>
    )},
    { key: "order", header: "Order", render: (row: ProductionItem) => (
      <Link href={`/orders/${row.order.id}`} className="text-indigo-600 hover:underline font-medium">
        {row.order.orderNumber}
      </Link>
    )},
    { key: "customer", header: "Customer", render: (row: ProductionItem) => row.order.customer.partyName },
    { key: "qty", header: "Qty", render: (row: ProductionItem) => (
      <span>{row.quantity}{row.size ? ` / ${row.size}` : ""}</span>
    )},
    { key: "priority", header: "Priority", render: (row: ProductionItem) => (
      <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", PRIORITY_COLORS[row.order.priority])}>
        {PRIORITY_LABELS[row.order.priority]}
      </span>
    )},
    { key: "stage", header: "Stage", render: (row: ProductionItem) => (
      <ProductionStageBadge stage={row.productionStage} />
    )},
    { key: "material", header: "Material", render: (row: ProductionItem) => {
      const pending = row.vendorRequestItems.reduce((sum, requestItem) => sum + requestItem.pendingQty, 0);
      return pending > 0 ? (
        <span className="text-xs font-medium text-amber-700">Pending {pending}</span>
      ) : (
        <span className="text-xs font-medium text-emerald-700">Ready</span>
      );
    }},
    { key: "dueDate", header: "Due", render: (row: ProductionItem) => (
      <span className="text-sm">{formatDate(row.order.promisedDeliveryDate)}</span>
    )},
    { key: "orderStatus", header: "Order Status", render: (row: ProductionItem) => (
      <OrderStatusBadge status={row.order.status as never} />
    )},
  ];

  // Group by stage
  const stageCounts = items.reduce((acc, item) => {
    acc[item.productionStage] = (acc[item.productionStage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Floor"
        description="Fast item-level queue for your factory floor, without per-order loading delays."
      />

      {/* Stage summary */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {Object.entries(PRODUCTION_STAGE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStageFilter(stageFilter === key ? "" : key)}
            className={`p-3 rounded-lg border text-center transition-colors ${
              stageFilter === key ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <p className="text-xl font-bold text-gray-900">{stageCounts[key] || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order, customer, product or SKU..."
              className="pl-9"
            />
          </div>
          <Select
            options={stageFilterOptions}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-52"
          />
          <span className="text-sm text-gray-500">{filteredItems.length} items</span>
        </div>
        <DataTable
          columns={columns}
          data={filteredItems}
          loading={loading}
          emptyMessage="No items in production"
        />
      </div>
    </div>
  );
}
