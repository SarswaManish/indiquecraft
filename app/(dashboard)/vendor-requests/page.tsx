"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { VendorStatusBadge } from "@/components/shared/status-badge";
import { formatDate, delayedDays } from "@/lib/utils";
import { VENDOR_STATUS_LABELS } from "@/lib/constants";
import { Plus, AlertTriangle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { VendorRequestStatus } from "@prisma/client";

interface VendorRequest {
  id: string;
  requestNumber: string;
  requestDate: string;
  expectedArrivalDate: string | null;
  status: VendorRequestStatus;
  vendor: { name: string; phone: string };
  _count: { vendorRequestItems: number };
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  ...Object.entries(VENDOR_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

export default function VendorRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 300);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search: debouncedSearch, status, limit: "50" });
    const res = await fetch(`/api/vendor-requests?${params}`);
    const data = await res.json();
    setRequests(data.requests || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [debouncedSearch, status]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const columns = [
    { key: "requestNumber", header: "Request #", render: (row: VendorRequest) => (
      <span className="font-mono font-medium text-indigo-700">{row.requestNumber}</span>
    )},
    { key: "vendor", header: "Vendor", render: (row: VendorRequest) => (
      <div>
        <p className="font-medium text-gray-900">{row.vendor.name}</p>
        <p className="text-xs text-gray-400">{row.vendor.phone}</p>
      </div>
    )},
    { key: "requestDate", header: "Requested", render: (row: VendorRequest) => formatDate(row.requestDate) },
    { key: "expectedArrivalDate", header: "Expected", render: (row: VendorRequest) => {
      if (!row.expectedArrivalDate) return <span className="text-gray-400">—</span>;
      const days = delayedDays(row.expectedArrivalDate);
      return (
        <div>
          <p>{formatDate(row.expectedArrivalDate)}</p>
          {days > 0 && row.status !== "FULLY_RECEIVED" && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle size={11} /> {days}d late
            </p>
          )}
        </div>
      );
    }},
    { key: "status", header: "Status", render: (row: VendorRequest) => <VendorStatusBadge status={row.status} /> },
    { key: "items", header: "Items", render: (row: VendorRequest) => row._count.vendorRequestItems },
  ];

  return (
    <div>
      <PageHeader
        title={`Vendor Requests (${total})`}
        description="Track raw material requests to vendors"
        actions={
          <Link href="/vendor-requests/new">
            <Button><Plus size={16} /> New Request</Button>
          </Link>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <SearchInput
            placeholder="Search request #, vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-52"
          />
        </div>
        <DataTable
          columns={columns}
          data={requests}
          loading={loading}
          emptyMessage="No vendor requests found"
          onRowClick={(row) => router.push(`/vendor-requests/${(row as VendorRequest).id}`)}
        />
      </div>
    </div>
  );
}
