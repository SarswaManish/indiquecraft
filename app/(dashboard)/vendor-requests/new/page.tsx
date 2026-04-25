"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Vendor { id: string; name: string; phone: string }
interface Order { id: string; orderNumber: string; customer: { partyName: string } }
interface OrderItem {
  id: string;
  product: { name: string; sku: string };
  quantity: number;
  size: string | null;
}

interface RequestItem {
  orderItemId: string;
  materialName: string;
  requestedQty: number;
  notes: string;
}

const emptyItem: RequestItem = { orderItemId: "", materialName: "", requestedQty: 1, notes: "" };

export default function NewVendorRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [vendorId, setVendorId] = useState(searchParams.get("vendorId") || "");
  const [selectedOrderId, setSelectedOrderId] = useState(searchParams.get("orderId") || "");
  const [expectedArrivalDate, setExpectedArrivalDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<RequestItem[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vendors?limit=100").then(r => r.json()).then(d => setVendors(d.vendors || []));
    fetch("/api/orders?limit=200&status=RAW_MATERIAL_PENDING").then(r => r.json())
      .then(d => {
        setOrders(d.orders || []);
      });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOrderItems() {
      if (!selectedOrderId) {
        if (active) setOrderItems([]);
        return;
      }

      const response = await fetch(`/api/orders/${selectedOrderId}`);
      const data = await response.json();
      if (!active) return;
      setOrderItems(data.orderItems || []);
    }

    void loadOrderItems();
    return () => {
      active = false;
    };
  }, [selectedOrderId]);

  function addItem() { setItems([...items, { ...emptyItem }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, patch: Partial<RequestItem>) {
    setItems(items.map((item, i) => i === idx ? { ...item, ...patch } : item));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) { setError("Please select a vendor"); return; }
    if (items.some(i => !i.orderItemId || !i.materialName)) {
      setError("Please fill in all item details"); return;
    }
    setError(""); setSaving(true);

    const res = await fetch("/api/vendor-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, expectedArrivalDate, notes, items }),
    });

    if (res.ok) {
      const vr = await res.json();
      router.push(`/vendor-requests/${vr.id}`);
    } else {
      const err = await res.json();
      setError(JSON.stringify(err.error));
      setSaving(false);
    }
  }

  const vendorOptions = [
    { value: "", label: "— Select Vendor —" },
    ...vendors.map(v => ({ value: v.id, label: `${v.name} (${v.phone})` })),
  ];
  const orderOptions = [
    { value: "", label: "— Select Order (to link items) —" },
    ...orders.map(o => ({ value: o.id, label: `${o.orderNumber} — ${o.customer.partyName}` })),
  ];
  const orderItemOptions = [
    { value: "", label: "— Select Order Item —" },
    ...orderItems.map(i => ({ value: i.id, label: `${i.product.sku} — ${i.product.name}${i.size ? ` (${i.size})` : ""} × ${i.quantity}` })),
  ];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New Vendor Request"
        description="Create a raw material request linked to order items"
        actions={<Button variant="outline" onClick={() => router.back()}><ArrowLeft size={16} /> Back</Button>}
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select label="Vendor *" options={vendorOptions} value={vendorId}
              onChange={(e) => setVendorId(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Expected Arrival Date" type="date" value={expectedArrivalDate}
                onChange={(e) => setExpectedArrivalDate(e.target.value)} />
              <Select label="Link to Order (optional)" options={orderOptions}
                value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} />
            </div>
            <Textarea label="Notes" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions for vendor" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Material Items ({items.length})</CardTitle>
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
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {orderItems.length > 0 && (
                  <Select label="Linked Order Item" options={orderItemOptions}
                    value={item.orderItemId}
                    onChange={(e) => updateItem(idx, { orderItemId: e.target.value })} />
                )}
                {orderItems.length === 0 && (
                  <Input label="Order Item ID" placeholder="Leave blank if no specific order"
                    value={item.orderItemId}
                    onChange={(e) => updateItem(idx, { orderItemId: e.target.value })} />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Material / Item Name *" required
                    value={item.materialName}
                    onChange={(e) => updateItem(idx, { materialName: e.target.value })}
                    placeholder="e.g. Silver casting — Ganesh 4 inch" />
                  <Input label="Requested Qty *" type="number" min={1} required
                    value={item.requestedQty}
                    onChange={(e) => updateItem(idx, { requestedQty: parseInt(e.target.value) || 1 })} />
                </div>
                <Input label="Notes" value={item.notes}
                  onChange={(e) => updateItem(idx, { notes: e.target.value })}
                  placeholder="Specific notes for this item" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={saving} size="lg">Create Request</Button>
        </div>
      </form>
    </div>
  );
}
