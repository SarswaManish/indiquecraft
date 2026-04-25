"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
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

const PAGE_SIZE = 15;

export default function VendorRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearch,
        status,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/vendor-requests?${params}`);
      const data = await res.json();
      if (!active) return;
      setRequests(data.requests || []);
      setTotal(data.total || 0);
      setLoading(false);
    }

    void loadRequests();
    return () => {
      active = false;
    };
  }, [debouncedSearch, status, page]);

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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
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
        <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
