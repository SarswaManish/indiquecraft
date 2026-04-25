"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { SOURCE_LABELS, PRIORITY_LABELS, FINISH_TYPE_LABELS } from "@/lib/constants";
import { OrderSource, OrderPriority, FinishType } from "@prisma/client";

interface Customer { id: string; partyName: string; phone: string }
interface Product { id: string; sku: string; name: string; rawMaterialRequired: boolean; finishType: FinishType }

interface OrderItem {
  productId: string;
  size: string;
  quantity: number;
  finishType: FinishType;
  rawMaterialRequired: boolean;
  notes: string;
}

const sourceOptions = Object.entries(SOURCE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const priorityOptions = Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }));
const finishOptions = Object.entries(FINISH_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));

const emptyItem: OrderItem = {
  productId: "", size: "", quantity: 1, finishType: "PLAIN", rawMaterialRequired: false, notes: "",
};

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState(searchParams.get("customerId") || "");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState("");
  const [source, setSource] = useState<OrderSource>("PHONE");
  const [priority, setPriority] = useState<OrderPriority>("NORMAL");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers?limit=200").then(r => r.json()).then(d => setCustomers(d.customers || []));
    fetch("/api/products?limit=200").then(r => r.json()).then(d => setProducts(d.products || []));
  }, []);

  function addItem() { setItems([...items, { ...emptyItem }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }

  function updateItem(idx: number, patch: Partial<OrderItem>) {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...patch };
      // If product selected, auto-fill rawMaterialRequired
      if (patch.productId) {
        const prod = products.find(p => p.id === patch.productId);
        if (prod) {
          updated.rawMaterialRequired = prod.rawMaterialRequired;
          updated.finishType = prod.finishType;
        }
      }
      return updated;
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) { setError("Please select a customer"); return; }
    if (items.some(i => !i.productId)) { setError("Please select product for all items"); return; }
    setError(""); setSaving(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, orderDate, promisedDeliveryDate, source, priority, notes, items }),
    });

    if (res.ok) {
      const order = await res.json();
      router.push(`/orders/${order.id}`);
    } else {
      const err = await res.json();
      setError(JSON.stringify(err.error));
      setSaving(false);
    }
  }

  const customerOptions = [
    { value: "", label: "— Select Customer —" },
    ...customers.map(c => ({ value: c.id, label: `${c.partyName} (${c.phone})` })),
  ];
  const productOptions = [
    { value: "", label: "— Select Product —" },
    ...products.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` })),
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="New Customer Order"
        description="Create a new order with line items"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft size={16} /> Back
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Header */}
        <Card>
          <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Customer *"
              options={customerOptions}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Order Date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
              <Input
                label="Promised Delivery Date"
                type="date"
                value={promisedDeliveryDate}
                onChange={(e) => setPromisedDeliveryDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Order Source"
                options={sourceOptions}
                value={source}
                onChange={(e) => setSource(e.target.value as OrderSource)}
              />
              <Select
                label="Priority"
                options={priorityOptions}
                value={priority}
                onChange={(e) => setPriority(e.target.value as OrderPriority)}
              />
            </div>
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or notes for this order"
            />
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Items ({items.length})</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus size={14} /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <Select
                  label="Product *"
                  options={productOptions}
                  value={item.productId}
                  onChange={(e) => updateItem(idx, { productId: e.target.value })}
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Size"
                    value={item.size}
                    onChange={(e) => updateItem(idx, { size: e.target.value })}
                    placeholder="e.g. 4 inch"
                  />
                  <Input
                    label="Quantity *"
                    type="number"
                    min={1}
                    required
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                  />
                  <Select
                    label="Finish"
                    options={finishOptions}
                    value={item.finishType}
                    onChange={(e) => updateItem(idx, { finishType: e.target.value as FinishType })}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={item.rawMaterialRequired}
                      onChange={(e) => updateItem(idx, { rawMaterialRequired: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    Requires raw material from vendor
                  </label>
                  {item.rawMaterialRequired && (
                    <Badge className="bg-yellow-100 text-yellow-700">Vendor request needed</Badge>
                  )}
                </div>
                <Input
                  label="Notes"
                  value={item.notes}
                  onChange={(e) => updateItem(idx, { notes: e.target.value })}
                  placeholder="Special notes for this item"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={saving} size="lg">Create Order</Button>
        </div>
      </form>
    </div>
  );
}
