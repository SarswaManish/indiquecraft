"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge, VendorStatusBadge } from "@/components/shared/status-badge";
import { formatDate, delayedDays } from "@/lib/utils";
import { Download, Search } from "lucide-react";

const reportTypes = [
  { value: "order-aging", label: "Order Aging Report" },
  { value: "delayed-orders", label: "Delayed Orders" },
  { value: "vendor-pending", label: "Vendor Pending Report" },
  { value: "raw-material-pending", label: "Raw Material Pending" },
  { value: "dispatch-summary", label: "Dispatch Summary" },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("order-aging");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  const runReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: reportType });
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const res = await fetch(`/api/reports?${params}`);
    const result = await res.json();
    setData(result);
    setLoading(false);
  }, [reportType, fromDate, toDate]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate factory reports" />

      <Card>
        <CardHeader><CardTitle>Report Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <Select
              label="Report Type"
              options={reportTypes}
              value={reportType}
              onChange={(e) => { setReportType(e.target.value); setData(null); }}
              className="w-64"
            />
            <Input
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-40"
            />
            <Input
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-40"
            />
            <Button onClick={runReport} loading={loading} className="self-end">
              <Search size={16} /> Run Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{reportTypes.find(r => r.value === reportType)?.label}</CardTitle>
              <Button variant="outline" size="sm">
                <Download size={14} /> Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Order Aging / Delayed Orders */}
            {(reportType === "order-aging" || reportType === "delayed-orders") && data.orders && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Order #", "Customer", "Order Date", "Due Date", "Overdue Days", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.orders.map((o: { id: string; orderNumber: string; customer: { partyName: string }; orderDate: string; promisedDeliveryDate: string | null; status: string }) => (
                    <tr key={o.id} className="text-sm">
                      <td className="px-4 py-3 font-mono font-medium text-indigo-700">{o.orderNumber}</td>
                      <td className="px-4 py-3 font-medium">{o.customer.partyName}</td>
                      <td className="px-4 py-3">{formatDate(o.orderDate)}</td>
                      <td className="px-4 py-3">{formatDate(o.promisedDeliveryDate)}</td>
                      <td className="px-4 py-3">
                        {delayedDays(o.promisedDeliveryDate) > 0 ? (
                          <span className="text-red-600 font-medium">{delayedDays(o.promisedDeliveryDate)}d</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status as never} /></td>
                    </tr>
                  ))}
                  {data.orders.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No data</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Vendor Pending */}
            {reportType === "vendor-pending" && data.requests && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Request #", "Vendor", "Requested", "Expected", "Items", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.requests.map((r: { id: string; requestNumber: string; vendor: { name: string }; requestDate: string; expectedArrivalDate: string | null; status: string; vendorRequestItems: unknown[] }) => (
                    <tr key={r.id} className="text-sm">
                      <td className="px-4 py-3 font-mono font-medium text-indigo-700">{r.requestNumber}</td>
                      <td className="px-4 py-3 font-medium">{r.vendor.name}</td>
                      <td className="px-4 py-3">{formatDate(r.requestDate)}</td>
                      <td className="px-4 py-3">
                        <span>{formatDate(r.expectedArrivalDate)}</span>
                        {delayedDays(r.expectedArrivalDate) > 0 && (
                          <span className="ml-1 text-red-600 text-xs">(+{delayedDays(r.expectedArrivalDate)}d)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{r.vendorRequestItems.length}</td>
                      <td className="px-4 py-3"><VendorStatusBadge status={r.status as never} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Raw Material Pending */}
            {reportType === "raw-material-pending" && data.items && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Product", "Order #", "Customer", "Qty", "Vendor Request"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((item: { id: string; product: { name: string; sku: string }; order: { orderNumber: string; customer: { partyName: string } }; quantity: number; vendorRequestItems: Array<{ vendorRequest: { requestNumber: string; vendor: { name: string } } }> }) => (
                    <tr key={item.id} className="text-sm">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{item.product.sku}</p>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-indigo-700">{item.order.orderNumber}</td>
                      <td className="px-4 py-3">{item.order.customer.partyName}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">
                        {item.vendorRequestItems.length > 0
                          ? item.vendorRequestItems.map((vri) => (
                              <Badge key={vri.vendorRequest.requestNumber} className="bg-blue-100 text-blue-700 mr-1">
                                {vri.vendorRequest.requestNumber} / {vri.vendorRequest.vendor.name}
                              </Badge>
                            ))
                          : <span className="text-red-500 text-xs font-medium">No request raised</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Dispatch Summary */}
            {reportType === "dispatch-summary" && data.dispatches && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Date", "Order #", "Customer", "Via", "Tracking #", "Type", "By"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.dispatches.map((d: { id: string; dispatchDate: string; order: { orderNumber: string; customer: { partyName: string } }; transporter: string | null; trackingNumber: string | null; isPartial: boolean; createdBy: { name: string } | null }) => (
                    <tr key={d.id} className="text-sm">
                      <td className="px-4 py-3">{formatDate(d.dispatchDate)}</td>
                      <td className="px-4 py-3 font-mono font-medium text-indigo-700">{d.order.orderNumber}</td>
                      <td className="px-4 py-3">{d.order.customer.partyName}</td>
                      <td className="px-4 py-3">{d.transporter || "—"}</td>
                      <td className="px-4 py-3">{d.trackingNumber || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={d.isPartial ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}>
                          {d.isPartial ? "Partial" : "Full"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{d.createdBy?.name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
