"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OrderStatusBadge, VendorStatusBadge } from "@/components/shared/status-badge";
import { delayedDays, formatDate } from "@/lib/utils";

const reportTypes = [
  { value: "order-aging", label: "Order Aging Report" },
  { value: "delayed-orders", label: "Delayed Orders" },
  { value: "vendor-pending", label: "Vendor Pending Report" },
  { value: "raw-material-pending", label: "Raw Material Pending" },
  { value: "dispatch-summary", label: "Dispatch Summary" },
] as const;

const PAGE_SIZE = 15;

type ReportType = (typeof reportTypes)[number]["value"];

interface ReportMeta {
  total: number;
  page: number;
  limit: number;
  activeOrders?: number;
  overdue?: number;
  withoutRequest?: number;
  partial?: number;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  orderDate: string;
  promisedDeliveryDate: string | null;
  status: string;
  customer: { partyName: string };
}

interface VendorPendingRow {
  id: string;
  requestNumber: string;
  requestDate: string;
  expectedArrivalDate: string | null;
  status: string;
  vendor: { name: string };
  vendorRequestItems: unknown[];
}

interface RawMaterialRow {
  id: string;
  quantity: number;
  product: { name: string; sku: string };
  order: { orderNumber: string; customer: { partyName: string } };
  vendorRequestItems: Array<{
    vendorRequest: { requestNumber: string; vendor: { name: string } };
  }>;
}

interface DispatchRow {
  id: string;
  dispatchDate: string;
  transporter: string | null;
  trackingNumber: string | null;
  isPartial: boolean;
  order: { orderNumber: string; customer: { partyName: string } };
  createdBy: { name: string } | null;
}

interface ReportResponse {
  orders?: OrderRow[];
  requests?: VendorPendingRow[];
  items?: RawMaterialRow[];
  dispatches?: DispatchRow[];
  meta?: ReportMeta;
}

function downloadCsv(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("order-aging");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportResponse | null>(null);

  const runReport = useCallback(async (nextPage = 1) => {
    setLoading(true);
    const params = new URLSearchParams({
      type: reportType,
      page: String(nextPage),
      limit: String(PAGE_SIZE),
    });
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    const res = await fetch(`/api/reports?${params}`);
    const result = (await res.json()) as ReportResponse;
    setData(result);
    setPage(nextPage);
    setLoading(false);
  }, [reportType, fromDate, toDate]);

  const summaryCards = useMemo(() => {
    if (!data?.meta) return [];

    switch (reportType) {
      case "order-aging":
        return [
          { title: "Active orders", value: data.meta.activeOrders ?? data.meta.total, color: "blue" as const },
          { title: "Records shown", value: data.orders?.length ?? 0, color: "gray" as const },
        ];
      case "delayed-orders":
        return [
          { title: "Delayed orders", value: data.meta.overdue ?? data.meta.total, color: "red" as const },
          { title: "Records shown", value: data.orders?.length ?? 0, color: "gray" as const },
        ];
      case "vendor-pending":
        return [
          { title: "Pending requests", value: data.meta.total, color: "blue" as const },
          { title: "Overdue requests", value: data.meta.overdue ?? 0, color: "orange" as const },
        ];
      case "raw-material-pending":
        return [
          { title: "Blocked items", value: data.meta.total, color: "yellow" as const },
          { title: "Without request", value: data.meta.withoutRequest ?? 0, color: "red" as const },
        ];
      case "dispatch-summary":
        return [
          { title: "Dispatch records", value: data.meta.total, color: "green" as const },
          { title: "Partial dispatches", value: data.meta.partial ?? 0, color: "orange" as const },
        ];
      default:
        return [];
    }
  }, [data, reportType]);

  const exportCurrentReport = useCallback(() => {
    if (!data) return;

    if ((reportType === "order-aging" || reportType === "delayed-orders") && data.orders) {
      downloadCsv(
        `${reportType}.csv`,
        data.orders.map((row) => ({
          order_number: row.orderNumber,
          customer: row.customer.partyName,
          order_date: formatDate(row.orderDate),
          due_date: formatDate(row.promisedDeliveryDate),
          overdue_days: delayedDays(row.promisedDeliveryDate) || 0,
          status: row.status,
        }))
      );
      return;
    }

    if (reportType === "vendor-pending" && data.requests) {
      downloadCsv(
        "vendor-pending.csv",
        data.requests.map((row) => ({
          request_number: row.requestNumber,
          vendor: row.vendor.name,
          requested: formatDate(row.requestDate),
          expected: formatDate(row.expectedArrivalDate),
          overdue_days: delayedDays(row.expectedArrivalDate) || 0,
          items: row.vendorRequestItems.length,
          status: row.status,
        }))
      );
      return;
    }

    if (reportType === "raw-material-pending" && data.items) {
      downloadCsv(
        "raw-material-pending.csv",
        data.items.map((row) => ({
          product: row.product.name,
          sku: row.product.sku,
          order_number: row.order.orderNumber,
          customer: row.order.customer.partyName,
          quantity: row.quantity,
          vendor_requests: row.vendorRequestItems
            .map((entry) => `${entry.vendorRequest.requestNumber} / ${entry.vendorRequest.vendor.name}`)
            .join("; "),
        }))
      );
      return;
    }

    if (reportType === "dispatch-summary" && data.dispatches) {
      downloadCsv(
        "dispatch-summary.csv",
        data.dispatches.map((row) => ({
          dispatch_date: formatDate(row.dispatchDate),
          order_number: row.order.orderNumber,
          customer: row.order.customer.partyName,
          transporter: row.transporter || "",
          tracking_number: row.trackingNumber || "",
          type: row.isPartial ? "Partial" : "Full",
          created_by: row.createdBy?.name || "",
        }))
      );
    }
  }, [data, reportType]);

  const orderColumns = [
    {
      key: "orderNumber",
      header: "Order #",
      render: (row: OrderRow) => <span className="font-mono font-medium text-indigo-700">{row.orderNumber}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (row: OrderRow) => <span className="font-medium text-slate-900">{row.customer.partyName}</span>,
    },
    { key: "orderDate", header: "Order Date", render: (row: OrderRow) => formatDate(row.orderDate) },
    { key: "promisedDeliveryDate", header: "Due Date", render: (row: OrderRow) => formatDate(row.promisedDeliveryDate) },
    {
      key: "overdue",
      header: "Overdue",
      render: (row: OrderRow) => {
        const overdue = delayedDays(row.promisedDeliveryDate);
        return overdue > 0 ? <span className="font-medium text-red-600">{overdue}d</span> : "—";
      },
    },
    { key: "status", header: "Status", render: (row: OrderRow) => <OrderStatusBadge status={row.status as never} /> },
  ];

  const vendorColumns = [
    {
      key: "requestNumber",
      header: "Request #",
      render: (row: VendorPendingRow) => <span className="font-mono font-medium text-indigo-700">{row.requestNumber}</span>,
    },
    { key: "vendor", header: "Vendor", render: (row: VendorPendingRow) => row.vendor.name },
    { key: "requestDate", header: "Requested", render: (row: VendorPendingRow) => formatDate(row.requestDate) },
    {
      key: "expectedArrivalDate",
      header: "Expected",
      render: (row: VendorPendingRow) => (
        <div>
          <p>{formatDate(row.expectedArrivalDate)}</p>
          {delayedDays(row.expectedArrivalDate) > 0 && (
            <p className="text-xs font-medium text-red-600">{delayedDays(row.expectedArrivalDate)}d late</p>
          )}
        </div>
      ),
    },
    { key: "items", header: "Items", render: (row: VendorPendingRow) => row.vendorRequestItems.length },
    { key: "status", header: "Status", render: (row: VendorPendingRow) => <VendorStatusBadge status={row.status as never} /> },
  ];

  const rawMaterialColumns = [
    {
      key: "product",
      header: "Product",
      render: (row: RawMaterialRow) => (
        <div>
          <p className="font-medium text-slate-900">{row.product.name}</p>
          <p className="text-xs font-mono text-slate-400">{row.product.sku}</p>
        </div>
      ),
    },
    { key: "order", header: "Order #", render: (row: RawMaterialRow) => row.order.orderNumber },
    { key: "customer", header: "Customer", render: (row: RawMaterialRow) => row.order.customer.partyName },
    { key: "quantity", header: "Qty" },
    {
      key: "vendorRequestItems",
      header: "Vendor Request",
      render: (row: RawMaterialRow) =>
        row.vendorRequestItems.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.vendorRequestItems.map((entry) => (
              <Badge
                key={entry.vendorRequest.requestNumber}
                className="bg-blue-100 text-blue-700"
              >
                {entry.vendorRequest.requestNumber} / {entry.vendorRequest.vendor.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs font-medium text-red-600">No request raised</span>
        ),
    },
  ];

  const dispatchColumns = [
    { key: "dispatchDate", header: "Date", render: (row: DispatchRow) => formatDate(row.dispatchDate) },
    {
      key: "order",
      header: "Order #",
      render: (row: DispatchRow) => <span className="font-mono font-medium text-indigo-700">{row.order.orderNumber}</span>,
    },
    { key: "customer", header: "Customer", render: (row: DispatchRow) => row.order.customer.partyName },
    { key: "transporter", header: "Via", render: (row: DispatchRow) => row.transporter || "—" },
    { key: "trackingNumber", header: "Tracking", render: (row: DispatchRow) => row.trackingNumber || "—" },
    {
      key: "type",
      header: "Type",
      render: (row: DispatchRow) => (
        <Badge className={row.isPartial ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}>
          {row.isPartial ? "Partial" : "Full"}
        </Badge>
      ),
    },
    { key: "createdBy", header: "By", render: (row: DispatchRow) => row.createdBy?.name || "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational reports for orders, vendors, raw material blockers, and dispatch."
        actions={
          <div className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
            <Sparkles size={14} className="mr-1 inline" />
            Run focused reports instead of loading everything at once
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Report Type"
              options={reportTypes.map((report) => ({ value: report.value, label: report.label }))}
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as ReportType);
                setData(null);
                setPage(1);
              }}
              className="w-full sm:w-64"
            />
            <Input
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full sm:w-44"
            />
            <Input
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full sm:w-44"
            />
            <Button onClick={() => void runReport(1)} loading={loading} className="self-end">
              <Search size={16} />
              Run Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          {summaryCards.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {summaryCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  color={card.color}
                />
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{reportTypes.find((report) => report.value === reportType)?.label}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Showing the latest filtered report rows with export and paging support.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={exportCurrentReport}>
                  <Download size={14} />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(reportType === "order-aging" || reportType === "delayed-orders") && (
                <DataTable
                  columns={orderColumns}
                  data={data.orders || []}
                  loading={loading}
                  emptyMessage="No report data found"
                  renderCard={(row) => (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold text-indigo-700">{row.orderNumber}</p>
                          <p className="mt-1 font-medium text-slate-900">{row.customer.partyName}</p>
                        </div>
                        <OrderStatusBadge status={row.status as never} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Order</p>
                          <p className="mt-1 text-slate-700">{formatDate(row.orderDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Due</p>
                          <p className="mt-1 text-slate-700">{formatDate(row.promisedDeliveryDate)}</p>
                          {delayedDays(row.promisedDeliveryDate) > 0 && (
                            <p className="text-xs font-medium text-red-600">{delayedDays(row.promisedDeliveryDate)}d overdue</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                />
              )}

              {reportType === "vendor-pending" && (
                <DataTable
                  columns={vendorColumns}
                  data={data.requests || []}
                  loading={loading}
                  emptyMessage="No report data found"
                  renderCard={(row) => (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold text-indigo-700">{row.requestNumber}</p>
                          <p className="mt-1 font-medium text-slate-900">{row.vendor.name}</p>
                        </div>
                        <VendorStatusBadge status={row.status as never} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Requested</p>
                          <p className="mt-1 text-slate-700">{formatDate(row.requestDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Expected</p>
                          <p className="mt-1 text-slate-700">{formatDate(row.expectedArrivalDate)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{row.vendorRequestItems.length} line items</p>
                    </div>
                  )}
                />
              )}

              {reportType === "raw-material-pending" && (
                <DataTable
                  columns={rawMaterialColumns}
                  data={data.items || []}
                  loading={loading}
                  emptyMessage="No report data found"
                  renderCard={(row) => (
                    <div className="space-y-3">
                      <div>
                        <p className="font-semibold text-slate-900">{row.product.name}</p>
                        <p className="mt-1 font-mono text-xs text-slate-400">{row.product.sku}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Order</p>
                          <p className="mt-1 text-slate-700">{row.order.orderNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Qty</p>
                          <p className="mt-1 text-slate-700">{row.quantity}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">{row.order.customer.partyName}</p>
                    </div>
                  )}
                />
              )}

              {reportType === "dispatch-summary" && (
                <DataTable
                  columns={dispatchColumns}
                  data={data.dispatches || []}
                  loading={loading}
                  emptyMessage="No report data found"
                  renderCard={(row) => (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold text-indigo-700">{row.order.orderNumber}</p>
                          <p className="mt-1 font-medium text-slate-900">{row.order.customer.partyName}</p>
                        </div>
                        <Badge className={row.isPartial ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}>
                          {row.isPartial ? "Partial" : "Full"}
                        </Badge>
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
                      </div>
                    </div>
                  )}
                />
              )}
              {data.meta && (
                <Pagination
                  page={page}
                  limit={PAGE_SIZE}
                  total={data.meta.total}
                  onPageChange={(nextPage) => void runReport(nextPage)}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
