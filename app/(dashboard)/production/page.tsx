"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Select } from "@/components/ui/select";
import { ProductionStageBadge, OrderStatusBadge } from "@/components/shared/status-badge";
import { PRODUCTION_STAGE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ProductionStage } from "@prisma/client";

interface ProductionItem {
  id: string;
  productionStage: ProductionStage;
  quantity: number;
  size: string | null;
  product: { name: string; sku: string };
  order: { id: string; orderNumber: string; status: string; promisedDeliveryDate: string | null; customer: { partyName: string } };
}

const stageFilterOptions = [
  { value: "", label: "All Stages" },
  ...Object.entries(PRODUCTION_STAGE_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

export default function ProductionPage() {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [stageFilter, setStageFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    // We query orders in production-relevant statuses
    const params = new URLSearchParams({ limit: "100" });
    if (!stageFilter || ["IN_PRODUCTION", "FINISHING", "PACKING", "READY_TO_DISPATCH"].includes(stageFilter)) {
      params.set("status", "IN_PRODUCTION");
    }
    const res = await fetch(`/api/orders?${params}`);
    const data = await res.json();

    // Flatten order items
    const allItems: ProductionItem[] = [];
    for (const order of (data.orders || [])) {
      // Fetch full order to get items
      const orderRes = await fetch(`/api/orders/${order.id}`);
      const orderData = await orderRes.json();
      for (const item of (orderData.orderItems || [])) {
        allItems.push({ ...item, order: { ...orderData, orderItems: undefined } });
      }
    }

    setItems(stageFilter ? allItems.filter(i => i.productionStage === stageFilter) : allItems);
    setLoading(false);
  }, [stageFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
    { key: "stage", header: "Stage", render: (row: ProductionItem) => (
      <ProductionStageBadge stage={row.productionStage} />
    )},
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
      <PageHeader title="Production Floor" description="Track all order items through production stages" />

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
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Select
            options={stageFilterOptions}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-52"
          />
          <span className="text-sm text-gray-500">{items.length} items</span>
        </div>
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          emptyMessage="No items in production"
        />
      </div>
    </div>
  );
}
