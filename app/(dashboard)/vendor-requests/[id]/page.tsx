"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { VendorStatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatDateTime, delayedDays } from "@/lib/utils";
import { VENDOR_STATUS_LABELS } from "@/lib/constants";
import { ArrowLeft, Phone, AlertTriangle, PackageCheck } from "lucide-react";
import Link from "next/link";
import { VendorRequestStatus } from "@prisma/client";

interface VRDetail {
  id: string;
  requestNumber: string;
  requestDate: string;
  expectedArrivalDate: string | null;
  actualReceiptDate: string | null;
  status: VendorRequestStatus;
  notes: string | null;
  vendor: { id: string; name: string; phone: string; whatsappNumber: string | null };
  vendorRequestItems: Array<{
    id: string;
    materialName: string;
    requestedQty: number;
    receivedQty: number;
    pendingQty: number;
    notes: string | null;
    orderItem: {
      id: string;
      quantity: number;
      size: string | null;
      product: { name: string; sku: string };
      order: { id: string; orderNumber: string; customer: { partyName: string } };
    };
  }>;
  materialReceipts: Array<{
    id: string;
    receivedDate: string;
    totalQtyReceived: number;
    remarks: string | null;
  }>;
}

const statusOptions = Object.entries(VENDOR_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));

export default function VendorRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vr, setVR] = useState<VRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptModal, setReceiptModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    receivedDate: new Date().toISOString().split("T")[0],
    remarks: "",
    items: {} as Record<string, number>,
  });
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [newStatus, setNewStatus] = useState<VendorRequestStatus>("REQUESTED");
  const [statusSaving, setStatusSaving] = useState(false);

  async function fetchVR() {
    const res = await fetch(`/api/vendor-requests/${id}`);
    const data = await res.json();
    setVR(data);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function loadVendorRequest() {
      const res = await fetch(`/api/vendor-requests/${id}`);
      const data = await res.json();
      if (!active) return;
      setVR(data);
      setLoading(false);
    }

    void loadVendorRequest();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleReceipt(e: React.FormEvent) {
    e.preventDefault();
    setReceiptSaving(true);
    const items = Object.entries(receiptForm.items)
      .filter(([, qty]) => qty > 0)
      .map(([vendorRequestItemId, qtyReceived]) => ({ vendorRequestItemId, qtyReceived }));

    if (items.length === 0) { setReceiptSaving(false); return; }

    await fetch(`/api/vendor-requests/${id}/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receivedDate: receiptForm.receivedDate, remarks: receiptForm.remarks, items }),
    });
    setReceiptSaving(false);
    setReceiptModal(false);
    fetchVR();
  }

  async function handleStatusUpdate() {
    setStatusSaving(true);
    await fetch(`/api/vendor-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusSaving(false);
    setStatusModal(false);
    fetchVR();
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  if (!vr) return <div className="text-center py-16 text-gray-500">Vendor request not found.</div>;

  const delayDays = delayedDays(vr.expectedArrivalDate);
  const isOverdue = delayDays > 0 && !["FULLY_RECEIVED", "CANCELLED"].includes(vr.status);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={vr.requestNumber}
        description={`Request to ${vr.vendor.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}><ArrowLeft size={16} /> Back</Button>
            <Button variant="secondary" onClick={() => { setNewStatus(vr.status); setStatusModal(true); }}>
              Update Status
            </Button>
            {!["FULLY_RECEIVED", "CANCELLED"].includes(vr.status) && (
              <Button onClick={() => setReceiptModal(true)}>
                <PackageCheck size={16} /> Record Receipt
              </Button>
            )}
          </div>
        }
      />

      {/* Status & meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Status</p>
          <div className="mt-1"><VendorStatusBadge status={vr.status} /></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Requested</p>
          <p className="text-sm font-medium mt-1">{formatDate(vr.requestDate)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Expected</p>
          <p className="text-sm font-medium mt-1">{formatDate(vr.expectedArrivalDate)}</p>
          {isOverdue && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
              <AlertTriangle size={11} /> {delayDays}d late
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Received</p>
          <p className="text-sm font-medium mt-1">{formatDate(vr.actualReceiptDate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vendor info */}
        <Card>
          <CardHeader><CardTitle>Vendor</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="font-medium text-gray-900">{vr.vendor.name}</p>
            <p className="flex items-center gap-1 text-gray-600"><Phone size={13} /> {vr.vendor.phone}</p>
            {vr.vendor.whatsappNumber && (
              <p className="text-gray-500">WA: {vr.vendor.whatsappNumber}</p>
            )}
            <Link href={`/vendors/${vr.vendor.id}`} className="text-xs text-indigo-600 hover:underline">
              View vendor profile →
            </Link>
          </CardContent>
        </Card>

        {/* Items */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader><CardTitle>Material Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {vr.vendorRequestItems.map((item) => (
                  <div key={item.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.materialName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Linked to:{" "}
                          <Link href={`/orders/${item.orderItem.order.id}`} className="text-indigo-600 hover:underline">
                            {item.orderItem.order.orderNumber}
                          </Link>
                          {" "}({item.orderItem.order.customer.partyName}) — {item.orderItem.product.name}
                        </p>
                        {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                      </div>
                      <div className="text-right text-sm space-y-1">
                        <div className="flex gap-3 text-xs">
                          <span className="text-gray-500">Req: <strong>{item.requestedQty}</strong></span>
                          <span className="text-green-600">Rcvd: <strong>{item.receivedQty}</strong></span>
                          <span className={item.pendingQty > 0 ? "text-orange-600" : "text-gray-400"}>
                            Pend: <strong>{item.pendingQty}</strong>
                          </span>
                        </div>
                        {item.pendingQty === 0 ? (
                          <Badge className="bg-green-100 text-green-700">Fully Received</Badge>
                        ) : (
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-green-500 h-1.5 rounded-full"
                              style={{ width: `${(item.receivedQty / item.requestedQty) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt history */}
      {vr.materialReceipts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Receipt History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {vr.materialReceipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium">{formatDateTime(r.receivedDate)}</p>
                    {r.remarks && <p className="text-xs text-gray-400">{r.remarks}</p>}
                  </div>
                  <Badge className="bg-green-100 text-green-700">+{r.totalQtyReceived} units</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Receipt Modal */}
      <Modal open={receiptModal} onClose={() => setReceiptModal(false)} title="Record Material Receipt">
        <form onSubmit={handleReceipt} className="space-y-4">
          <Input
            label="Receipt Date"
            type="date"
            value={receiptForm.receivedDate}
            onChange={(e) => setReceiptForm({ ...receiptForm, receivedDate: e.target.value })}
          />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Quantities Received</p>
            <div className="space-y-2">
              {vr.vendorRequestItems.filter(i => i.pendingQty > 0).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="text-sm font-medium">{item.materialName}</p>
                    <p className="text-xs text-gray-500">Pending: {item.pendingQty}</p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={item.pendingQty}
                    placeholder="Qty"
                    className="w-24"
                    value={receiptForm.items[item.id] || 0}
                    onChange={(e) => setReceiptForm({
                      ...receiptForm,
                      items: { ...receiptForm.items, [item.id]: parseInt(e.target.value) || 0 },
                    })}
                  />
                </div>
              ))}
            </div>
          </div>
          <Textarea
            label="Remarks"
            value={receiptForm.remarks}
            onChange={(e) => setReceiptForm({ ...receiptForm, remarks: e.target.value })}
            placeholder="Any notes about this receipt"
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setReceiptModal(false)}>Cancel</Button>
            <Button type="submit" loading={receiptSaving}>Record Receipt</Button>
          </div>
        </form>
      </Modal>

      {/* Status Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Update Request Status">
        <div className="space-y-4">
          <Select
            label="New Status"
            options={statusOptions}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as VendorRequestStatus)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStatusModal(false)}>Cancel</Button>
            <Button loading={statusSaving} onClick={handleStatusUpdate}>Update</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
