"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  OrderStatusBadge,
  PriorityBadge,
  ProductionStageBadge,
} from "@/components/shared/status-badge";
import { formatDate, formatDateTime, delayedDays } from "@/lib/utils";
import {
  FINISH_TYPE_LABELS,
  PRODUCTION_STAGE_LABELS,
  ORDER_STATUS_LABELS,
} from "@/lib/constants";
import { ArrowLeft, AlertTriangle, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { OrderStatus, ProductionStage, FinishType } from "@prisma/client";

interface OrderDetail {
  id: string;
  orderNumber: string;
  orderDate: string;
  promisedDeliveryDate: string | null;
  source: string;
  priority: string;
  status: OrderStatus;
  notes: string | null;
  customer: { id: string; partyName: string; phone: string; city: string | null };
  orderItems: Array<{
    id: string;
    size: string | null;
    quantity: number;
    finishType: FinishType;
    rawMaterialRequired: boolean;
    productionStage: ProductionStage;
    notes: string | null;
    product: { name: string; sku: string };
    vendorRequestItems: Array<{
      id: string;
      materialName: string;
      requestedQty: number;
      receivedQty: number;
      pendingQty: number;
      vendorRequest: { id: string; requestNumber: string; status: string; vendor: { name: string } };
    }>;
    productionLogs: Array<{
      id: string;
      stage: ProductionStage;
      loggedAt: string;
      assignedPerson: string | null;
      remarks: string | null;
      updatedBy: { name: string } | null;
    }>;
    dispatchItems: Array<{
      qtyDispatched: number;
    }>;
  }>;
  dispatches: Array<{
    id: string;
    dispatchDate: string;
    transporter: string | null;
    trackingNumber: string | null;
    isPartial: boolean;
    remarks: string | null;
    createdBy: { name: string } | null;
    dispatchItems: Array<{
      qtyDispatched: number;
      orderItem: { product: { name: string } };
    }>;
  }>;
}

const stageOptions = Object.entries(PRODUCTION_STAGE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageModal, setStageModal] = useState<{ open: boolean; itemId: string; currentStage: ProductionStage } | null>(null);
  const [dispatchModal, setDispatchModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);

  // Stage update form
  const [stageForm, setStageForm] = useState({ stage: "MANUFACTURING" as ProductionStage, assignedPerson: "", remarks: "" });
  const [stageSaving, setStageSaving] = useState(false);

  // Dispatch form
  const [dispatchForm, setDispatchForm] = useState({
    dispatchDate: new Date().toISOString().split("T")[0],
    transporter: "",
    trackingNumber: "",
    remarks: "",
    selectedItems: {} as Record<string, number>,
  });
  const [dispatchSaving, setDispatchSaving] = useState(false);
  const [dispatchError, setDispatchError] = useState("");
  const [stageError, setStageError] = useState("");

  // Status update
  const [newStatus, setNewStatus] = useState<OrderStatus>("NEW");
  const [statusSaving, setStatusSaving] = useState(false);

  async function fetchOrder() {
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json();
    setOrder(data);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (!active) return;
      setOrder(data);
      setLoading(false);
    }

    void loadOrder();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleStageUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!stageModal) return;
    setStageSaving(true);
    setStageError("");
    const response = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId: stageModal.itemId, ...stageForm }),
    });
    if (!response.ok) {
      const error = await response.json();
      setStageError(error.error || "Unable to update stage");
      setStageSaving(false);
      return;
    }
    setStageSaving(false);
    setStageModal(null);
    void fetchOrder();
  }

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    setDispatchSaving(true);
    setDispatchError("");
    const items = Object.entries(dispatchForm.selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([orderItemId, qtyDispatched]) => ({ orderItemId, qtyDispatched }));

    if (items.length === 0) {
      setDispatchError("Select at least one line item quantity to dispatch.");
      setDispatchSaving(false);
      return;
    }

    const response = await fetch("/api/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, ...dispatchForm, items }),
    });
    if (!response.ok) {
      const error = await response.json();
      setDispatchError(error.error || "Unable to create dispatch");
      setDispatchSaving(false);
      return;
    }
    setDispatchSaving(false);
    setDispatchModal(false);
    setDispatchForm({
      dispatchDate: new Date().toISOString().split("T")[0],
      transporter: "",
      trackingNumber: "",
      remarks: "",
      selectedItems: {},
    });
    void fetchOrder();
  }

  async function handleStatusUpdate() {
    setStatusSaving(true);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusSaving(false);
    setStatusModal(false);
    fetchOrder();
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  if (!order) return <div className="text-center py-16 text-gray-500">Order not found.</div>;

  const delayDays = delayedDays(order.promisedDeliveryDate);
  const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalDispatchedQuantity = order.orderItems.reduce(
    (sum, item) =>
      sum +
      item.dispatchItems.reduce((itemSum, dispatchItem) => itemSum + dispatchItem.qtyDispatched, 0),
    0
  );
  const blockedItems = order.orderItems.filter(
    (item) =>
      item.rawMaterialRequired &&
      item.vendorRequestItems.some((requestItem) => requestItem.pendingQty > 0)
  ).length;
  const readyItems = order.orderItems.filter((item) => item.productionStage === "COMPLETED").length;

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title={order.orderNumber}
        description={`Order for ${order.customer.partyName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.back()}><ArrowLeft size={16} /> Back</Button>
            <Button variant="secondary" onClick={() => { setNewStatus(order.status); setStatusModal(true); }}>
              Update Status
            </Button>
            <Button onClick={() => setDispatchModal(true)}>
              <Truck size={16} /> Dispatch
            </Button>
          </div>
        }
      />

      {/* Order Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Status</p>
          <div className="mt-1"><OrderStatusBadge status={order.status} /></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Priority</p>
          <div className="mt-1"><PriorityBadge priority={order.priority as never} /></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Order Date</p>
          <p className="text-sm font-medium mt-1">{formatDate(order.orderDate)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Due Date</p>
          <p className="text-sm font-medium mt-1">{formatDate(order.promisedDeliveryDate)}</p>
          {delayDays > 0 && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
              <AlertTriangle size={11} /> {delayDays}d overdue
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Material Watch</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{blockedItems}</p>
          <p className="mt-1 text-sm text-amber-800">items still blocked waiting for vendor material</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Ready Items</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{readyItems}/{order.orderItems.length}</p>
          <p className="mt-1 text-sm text-emerald-800">items completed and ready for dispatch planning</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Dispatch Progress</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">{totalDispatchedQuantity}/{totalQuantity}</p>
          <p className="mt-1 text-sm text-blue-800">units already dispatched from this order</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Customer info */}
        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="font-medium text-gray-900">{order.customer.partyName}</p>
            <p className="text-gray-600">{order.customer.phone}</p>
            {order.customer.city && <p className="text-gray-500">{order.customer.city}</p>}
            {order.notes && (
              <div className="border-t pt-2 text-gray-500">{order.notes}</div>
            )}
          </CardContent>
        </Card>

        {/* Vendor requests summary */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vendor Requests</CardTitle>
                <Link href={`/vendor-requests/new?orderId=${id}`}>
                  <Button size="sm" variant="outline"><Plus size={14} /> New Request</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {order.orderItems.every(i => i.vendorRequestItems.length === 0) ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  No vendor requests linked yet
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {order.orderItems.flatMap(item =>
                    item.vendorRequestItems.map(vri => (
                      <Link
                        key={vri.id}
                        href={`/vendor-requests/${vri.vendorRequest.id}`}
                        className="flex flex-col gap-3 px-5 py-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      >
                        <div>
                          <p className="text-sm font-medium">{vri.vendorRequest.requestNumber}</p>
                          <p className="text-xs text-gray-500">
                            {vri.vendorRequest.vendor.name} · {vri.materialName}
                          </p>
                        </div>
                        <div className="text-left text-xs sm:text-right">
                          <p>Req: {vri.requestedQty} | Rcvd: {vri.receivedQty} | Pend: {vri.pendingQty}</p>
                          <Badge className={
                            vri.pendingQty === 0 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }>
                            {vri.pendingQty === 0 ? "Received" : "Pending"}
                          </Badge>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Items with Production Stage */}
      <Card>
        <CardHeader><CardTitle>Order Items & Production</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {order.orderItems.map((item) => (
              <div key={item.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{item.product.name}</span>
                      <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{item.product.sku}</span>
                      {item.size && <span className="text-xs text-gray-500">{item.size}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span>Qty: <strong>{item.quantity}</strong></span>
                      <span>Finish: {FINISH_TYPE_LABELS[item.finishType]}</span>
                      {item.rawMaterialRequired && (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">Needs Raw Matl.</Badge>
                      )}
                    </div>
                    {item.notes && <p className="text-xs text-gray-400 mt-1">{item.notes}</p>}

                    {/* Production log timeline */}
                    {item.productionLogs.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.productionLogs.slice(0, 3).map((log) => (
                          <div key={log.id} className="text-xs text-gray-400 flex items-center gap-2">
                            <span>{formatDateTime(log.loggedAt)}</span>
                            <span>→</span>
                            <span className="text-gray-600">{PRODUCTION_STAGE_LABELS[log.stage]}</span>
                            {log.assignedPerson && <span>({log.assignedPerson})</span>}
                            {log.remarks && <span className="italic">{log.remarks}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row items-center justify-between gap-3 lg:flex-col lg:items-end">
                    <ProductionStageBadge stage={item.productionStage} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setStageForm({ stage: item.productionStage, assignedPerson: "", remarks: "" });
                        setStageModal({ open: true, itemId: item.id, currentStage: item.productionStage });
                      }}
                    >
                      Update Stage
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dispatch history */}
      {order.dispatches.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Dispatch History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {order.dispatches.map((d) => (
                <div key={d.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{formatDate(d.dispatchDate)}</p>
                      {d.transporter && <p className="text-xs text-gray-500">Via {d.transporter}</p>}
                      {d.trackingNumber && <p className="text-xs text-gray-500">Tracking: {d.trackingNumber}</p>}
                    </div>
                    <div className="text-left sm:text-right">
                      {d.isPartial && <Badge className="bg-orange-100 text-orange-700">Partial</Badge>}
                      {d.createdBy && <p className="text-xs text-gray-400 mt-1">By {d.createdBy.name}</p>}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d.dispatchItems.map((di, i) => (
                      <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {di.orderItem.product.name} × {di.qtyDispatched}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Stage Update Modal */}
      {stageModal && (
        <Modal open={stageModal.open} onClose={() => setStageModal(null)} title="Update Production Stage">
          <form onSubmit={handleStageUpdate} className="space-y-4">
            <Select
              label="New Stage"
              options={stageOptions}
              value={stageForm.stage}
              onChange={(e) => setStageForm({ ...stageForm, stage: e.target.value as ProductionStage })}
            />
            <Input
              label="Assigned Person"
              value={stageForm.assignedPerson}
              onChange={(e) => setStageForm({ ...stageForm, assignedPerson: e.target.value })}
              placeholder="Worker name (optional)"
            />
            <Textarea
              label="Remarks"
              value={stageForm.remarks}
              onChange={(e) => setStageForm({ ...stageForm, remarks: e.target.value })}
              placeholder="Any notes"
            />
            {stageError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {stageError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setStageModal(null)}>Cancel</Button>
              <Button type="submit" loading={stageSaving}>Update Stage</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dispatch Modal */}
      <Modal open={dispatchModal} onClose={() => setDispatchModal(false)} title="Create Dispatch" size="lg">
        <form onSubmit={handleDispatch} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Dispatch Date"
              type="date"
              value={dispatchForm.dispatchDate}
              onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })}
            />
            <Input
              label="Transporter / Courier"
              value={dispatchForm.transporter}
              onChange={(e) => setDispatchForm({ ...dispatchForm, transporter: e.target.value })}
              placeholder="e.g. DTDC, BlueDart"
            />
          </div>
          <Input
            label="Tracking Number"
            value={dispatchForm.trackingNumber}
            onChange={(e) => setDispatchForm({ ...dispatchForm, trackingNumber: e.target.value })}
            placeholder="AWB / Tracking #"
          />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Items to Dispatch</p>
            <div className="space-y-2">
              {order.orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-gray-500">
                      Total {item.quantity} · Dispatched {item.dispatchItems.reduce((sum, dispatchItem) => sum + dispatchItem.qtyDispatched, 0)} · Remaining {item.quantity - item.dispatchItems.reduce((sum, dispatchItem) => sum + dispatchItem.qtyDispatched, 0)}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={item.quantity - item.dispatchItems.reduce((sum, dispatchItem) => sum + dispatchItem.qtyDispatched, 0)}
                    placeholder="Qty"
                    className="w-20"
                    value={dispatchForm.selectedItems[item.id] || 0}
                    disabled={item.quantity - item.dispatchItems.reduce((sum, dispatchItem) => sum + dispatchItem.qtyDispatched, 0) === 0}
                    onChange={(e) => setDispatchForm({
                      ...dispatchForm,
                      selectedItems: { ...dispatchForm.selectedItems, [item.id]: parseInt(e.target.value) || 0 },
                    })}
                  />
                </div>
              ))}
            </div>
          </div>
          {dispatchError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {dispatchError}
            </div>
          )}
          <Textarea
            label="Remarks"
            value={dispatchForm.remarks}
            onChange={(e) => setDispatchForm({ ...dispatchForm, remarks: e.target.value })}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setDispatchModal(false)}>Cancel</Button>
            <Button type="submit" loading={dispatchSaving}>Confirm Dispatch</Button>
          </div>
        </form>
      </Modal>

      {/* Status Update Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Update Order Status">
        <div className="space-y-4">
          <Select
            label="New Status"
            options={statusOptions}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStatusModal(false)}>Cancel</Button>
            <Button loading={statusSaving} onClick={handleStatusUpdate}>Update Status</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
