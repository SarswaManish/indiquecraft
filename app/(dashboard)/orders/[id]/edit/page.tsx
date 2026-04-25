"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock, Plus, Trash2 } from "lucide-react";
import { FinishType, OrderPriority, OrderSource } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/toast-context";
import {
  FINISH_TYPE_LABELS,
  PRIORITY_LABELS,
  SOURCE_LABELS,
} from "@/lib/constants";

interface Customer {
  id: string;
  partyName: string;
  phone: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  rawMaterialRequired: boolean;
  finishType: FinishType;
}

interface EditableOrderDetail {
  id: string;
  orderNumber: string;
  customer: { id: string };
  promisedDeliveryDate: string | null;
  source: OrderSource;
  priority: OrderPriority;
  notes: string | null;
  orderItems: Array<{
    id: string;
    product: { id: string; name: string; sku: string };
    quantity: number;
    size: string | null;
    finishType: FinishType;
    rawMaterialRequired: boolean;
    notes: string | null;
    vendorRequestItems: Array<{ pendingQty: number }>;
    productionLogs: Array<{ id: string }>;
    dispatchItems: Array<{ qtyDispatched: number }>;
  }>;
}

interface EditableItem {
  id?: string;
  productId: string;
  size: string;
  quantity: number;
  finishType: FinishType;
  rawMaterialRequired: boolean;
  notes: string;
  lockedProduct: boolean;
  lockedRawMaterial: boolean;
  lockedDelete: boolean;
  minQuantity: number;
  existingName?: string;
  existingSku?: string;
}

const sourceOptions = Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }));
const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));
const finishOptions = Object.entries(FINISH_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const emptyItem: EditableItem = {
  productId: "",
  size: "",
  quantity: 1,
  finishType: "PLAIN",
  rawMaterialRequired: false,
  notes: "",
  lockedProduct: false,
  lockedRawMaterial: false,
  lockedDelete: false,
  minQuantity: 1,
};

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderNumber, setOrderNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState("");
  const [source, setSource] = useState<OrderSource>("PHONE");
  const [priority, setPriority] = useState<OrderPriority>("NORMAL");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EditableItem[]>([{ ...emptyItem }]);

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      const [orderRes, customersRes, productsRes] = await Promise.all([
        fetch(`/api/orders/${id}`),
        fetch("/api/customers?limit=200"),
        fetch("/api/products?limit=200"),
      ]);

      if (!active) return;

      const [orderData, customersData, productsData] = await Promise.all([
        orderRes.json() as Promise<EditableOrderDetail>,
        customersRes.json() as Promise<{ customers: Customer[] }>,
        productsRes.json() as Promise<{ products: Product[] }>,
      ]);

      setCustomers(customersData.customers || []);
      setProducts(productsData.products || []);
      setOrderNumber(orderData.orderNumber);
      setCustomerId(orderData.customer.id);
      setPromisedDeliveryDate(orderData.promisedDeliveryDate?.split("T")[0] || "");
      setSource(orderData.source);
      setPriority(orderData.priority);
      setNotes(orderData.notes || "");
      setItems(
        orderData.orderItems.map((item) => {
          const dispatchedQty = item.dispatchItems.reduce((sum, dispatchItem) => sum + dispatchItem.qtyDispatched, 0);
          const hasVendorLinks = item.vendorRequestItems.length > 0;
          const hasProductionLogs = item.productionLogs.length > 0;
          const lockedByActivity = dispatchedQty > 0 || hasVendorLinks || hasProductionLogs;

          return {
            id: item.id,
            productId: item.product.id,
            size: item.size || "",
            quantity: item.quantity,
            finishType: item.finishType,
            rawMaterialRequired: item.rawMaterialRequired,
            notes: item.notes || "",
            lockedProduct: lockedByActivity,
            lockedRawMaterial: hasVendorLinks,
            lockedDelete: lockedByActivity,
            minQuantity: Math.max(1, dispatchedQty),
            existingName: item.product.name,
            existingSku: item.product.sku,
          };
        })
      );
      setLoading(false);
    }

    void loadFormData();
    return () => {
      active = false;
    };
  }, [id]);

  const customerOptions = useMemo(
    () => [
      { value: "", label: "— Select Customer —" },
      ...customers.map((customer) => ({
        value: customer.id,
        label: `${customer.partyName} (${customer.phone})`,
      })),
    ],
    [customers]
  );

  const productOptions = useMemo(
    () => [
      { value: "", label: "— Select Product —" },
      ...products.map((product) => ({
        value: product.id,
        label: `${product.sku} — ${product.name}`,
      })),
    ],
    [products]
  );

  function addItem() {
    setItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextItem = { ...item, ...patch };
        if (patch.productId) {
          const selectedProduct = products.find((product) => product.id === patch.productId);
          if (selectedProduct) {
            nextItem.finishType = selectedProduct.finishType;
            if (!item.lockedRawMaterial) {
              nextItem.rawMaterialRequired = selectedProduct.rawMaterialRequired;
            }
          }
        }
        return nextItem;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerId) {
      showToast({
        tone: "error",
        title: "Customer is required",
        description: "Please choose the party for this order.",
      });
      return;
    }

    if (items.some((item) => !item.productId)) {
      showToast({
        tone: "error",
        title: "Product missing on one or more items",
        description: "Every order line must have a selected product.",
      });
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        promisedDeliveryDate,
        source,
        priority,
        notes,
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          finishType: item.finishType,
          rawMaterialRequired: item.rawMaterialRequired,
          notes: item.notes,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showToast({
        tone: "error",
        title: "Order update failed",
        description: error.error || "Please review the changes and try again.",
      });
      setSaving(false);
      return;
    }

    showToast({
      title: "Order updated",
      description: "The order details and item lines were saved successfully.",
    });
    router.push(`/orders/${id}`);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`Edit ${orderNumber}`}
        description="Update order details, adjust quantities, and add new items safely."
        actions={
          <Button variant="outline" onClick={() => router.push(`/orders/${id}`)}>
            <ArrowLeft size={16} />
            Back to Order
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Customer *"
              options={customerOptions}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Promised Delivery Date"
                type="date"
                value={promisedDeliveryDate}
                onChange={(e) => setPromisedDeliveryDate(e.target.value)}
              />
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
              placeholder="Any special instructions or pending notes"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Items ({items.length})</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus size={14} />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id || index} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Item {index + 1}</p>
                    {(item.lockedProduct || item.lockedRawMaterial || item.lockedDelete) && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                        <Lock size={12} />
                        Linked activity exists, so some fields are protected.
                      </p>
                    )}
                  </div>
                  {!item.lockedDelete && items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="rounded-full p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <Select
                    label="Product *"
                    options={productOptions}
                    value={item.productId}
                    onChange={(e) => updateItem(index, { productId: e.target.value })}
                    disabled={item.lockedProduct}
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Input
                      label="Size"
                      value={item.size}
                      onChange={(e) => updateItem(index, { size: e.target.value })}
                      placeholder="e.g. 4 inch"
                    />
                    <Input
                      label="Quantity *"
                      type="number"
                      min={item.minQuantity}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, {
                          quantity: Math.max(item.minQuantity, parseInt(e.target.value, 10) || item.minQuantity),
                        })
                      }
                    />
                    <Select
                      label="Finish"
                      options={finishOptions}
                      value={item.finishType}
                      onChange={(e) => updateItem(index, { finishType: e.target.value as FinishType })}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.rawMaterialRequired}
                        disabled={item.lockedRawMaterial}
                        onChange={(e) => updateItem(index, { rawMaterialRequired: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      Requires raw material from vendor
                    </label>
                    {item.rawMaterialRequired && (
                      <Badge className="bg-yellow-100 text-yellow-700">Vendor request needed</Badge>
                    )}
                    {item.lockedDelete && (
                      <Badge className="bg-slate-100 text-slate-600">
                        Existing linked item
                      </Badge>
                    )}
                  </div>

                  {item.minQuantity > 1 && (
                    <p className="text-xs text-slate-500">
                      Quantity cannot go below {item.minQuantity} because part of this item is already dispatched.
                    </p>
                  )}

                  <Textarea
                    label="Notes"
                    value={item.notes}
                    onChange={(e) => updateItem(index, { notes: e.target.value })}
                    placeholder="Special notes for this item"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`/orders/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} size="lg">
            Save Order Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
