"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Plus, Phone, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/lib/toast-context";

interface Vendor {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  materialSupplied: string | null;
  standardLeadDays: number;
  isActive: boolean;
  _count: { vendorRequests: number };
}

const emptyForm = {
  name: "", phone: "", whatsappNumber: "", city: "",
  materialSupplied: "", standardLeadDays: 7, notes: "",
};
const PAGE_SIZE = 15;

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(search, 300);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;

    async function loadVendors() {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: String(page),
        limit: String(PAGE_SIZE),
        includeInactive: String(showInactive),
      });
      const res = await fetch(`/api/vendors?${params}`);
      const data = await res.json();
      if (!active) return;
      setVendors(data.vendors || []);
      setTotal(data.total || 0);
      setSelectedVendorIds([]);
      setLoading(false);
    }

    void loadVendors();
    return () => {
      active = false;
    };
  }, [debouncedSearch, showInactive, page]);

  async function refreshVendors() {
    setLoading(true);
    const params = new URLSearchParams({
      search: debouncedSearch,
      page: String(page),
      limit: String(PAGE_SIZE),
      includeInactive: String(showInactive),
    });
    const res = await fetch(`/api/vendors?${params}`);
    const data = await res.json();
    setVendors(data.vendors || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const response = await fetch(editingVendorId ? `/api/vendors/${editingVendorId}` : "/api/vendors", {
      method: editingVendorId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showToast({
        tone: "error",
        title: editingVendorId ? "Vendor update failed" : "Vendor creation failed",
        description: error.error || "Please review the vendor details and try again.",
      });
      setSaving(false);
      return;
    }
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    setEditingVendorId(null);
    showToast({
      title: editingVendorId ? "Vendor updated" : "Vendor created",
      description: form.name,
    });
    await refreshVendors();
  }

  async function handleArchive(vendor: Vendor) {
    const response = await fetch(`/api/vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !vendor.isActive }),
    });
    if (!response.ok) {
      showToast({
        tone: "error",
        title: "Vendor status update failed",
        description: `Could not ${vendor.isActive ? "archive" : "restore"} ${vendor.name}.`,
      });
      return;
    }
    showToast({
      title: vendor.isActive ? "Vendor archived" : "Vendor restored",
      description: vendor.name,
    });
    await refreshVendors();
  }

  async function handleBulkArchive(nextActiveState: boolean) {
    await Promise.all(
      selectedVendorIds.map((vendorId) =>
        fetch(`/api/vendors/${vendorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextActiveState }),
        })
      )
    );
    setSelectedVendorIds([]);
    showToast({
      title: nextActiveState ? "Vendors restored" : "Vendors archived",
      description: `${selectedVendorIds.length} records updated.`,
    });
    await refreshVendors();
  }

  async function handleEdit(vendor: Vendor) {
    const response = await fetch(`/api/vendors/${vendor.id}`);
    const detail = await response.json();
    setEditingVendorId(vendor.id);
    setForm({
      name: detail.name,
      phone: detail.phone,
      whatsappNumber: detail.whatsappNumber || "",
      city: detail.city || "",
      materialSupplied: detail.materialSupplied || "",
      standardLeadDays: detail.standardLeadDays,
      notes: detail.notes || "",
    });
    setModalOpen(true);
  }

  function toggleVendorSelection(vendorId: string) {
    setSelectedVendorIds((current) =>
      current.includes(vendorId)
        ? current.filter((id) => id !== vendorId)
        : [...current, vendorId]
    );
  }

  const areAllVisibleSelected =
    vendors.length > 0 && vendors.every((vendor) => selectedVendorIds.includes(vendor.id));

  const columns = [
    { key: "select", header: "", render: (row: Vendor) => (
      <div onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={selectedVendorIds.includes(row.id)}
          onChange={() => toggleVendorSelection(row.id)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
        />
      </div>
    ), className: "w-12" },
    { key: "name", header: "Vendor Name", render: (row: Vendor) => (
      <span className="font-medium text-gray-900">{row.name}</span>
    )},
    { key: "phone", header: "Phone", render: (row: Vendor) => (
      <span className="flex items-center gap-1"><Phone size={13} className="text-gray-400" />{row.phone}</span>
    )},
    { key: "city", header: "City", render: (row: Vendor) => row.city || "—" },
    { key: "materialSupplied", header: "Material", render: (row: Vendor) => (
      <span className="text-gray-600 text-sm">{row.materialSupplied || "—"}</span>
    )},
    { key: "standardLeadDays", header: "Lead", render: (row: Vendor) => `${row.standardLeadDays}d` },
    { key: "requests", header: "Requests", render: (row: Vendor) => row._count.vendorRequests },
    { key: "status", header: "Status", render: (row: Vendor) => (
      row.isActive
        ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
        : <Badge className="bg-gray-100 text-gray-500">Archived</Badge>
    )},
    { key: "actions", header: "", render: (row: Vendor) => (
      <div onClick={(event) => event.stopPropagation()} className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(row)}>
          <Pencil size={14} />
          Edit
        </Button>
        <Button
          type="button"
          variant={row.isActive ? "outline" : "secondary"}
          size="sm"
          onClick={() => void handleArchive(row)}
        >
          {row.isActive ? <Trash2 size={14} /> : <RotateCcw size={14} />}
          {row.isActive ? "Archive" : "Restore"}
        </Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title={`Vendors (${total})`}
        description="Manage suppliers, clean up inactive records, and edit vendor profiles quickly."
        actions={
          <Button onClick={() => {
            setEditingVendorId(null);
            setForm(emptyForm);
            setModalOpen(true);
          }}>
            <Plus size={16} /> Add Vendor
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <SearchInput
              placeholder="Search vendor name, city, material…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-sm"
            />
            <Button
              variant={showInactive ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setShowInactive((value) => !value);
                setPage(1);
              }}
            >
              {showInactive ? "Hide Archived" : "Show Archived"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
              <input
                type="checkbox"
                checked={areAllVisibleSelected}
                onChange={() =>
                  setSelectedVendorIds(areAllVisibleSelected ? [] : vendors.map((vendor) => vendor.id))
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              Select all
            </label>
            {selectedVendorIds.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => void handleBulkArchive(false)}>
                  <Trash2 size={14} /> Archive Selected ({selectedVendorIds.length})
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void handleBulkArchive(true)}>
                  <RotateCcw size={14} /> Restore Selected
                </Button>
              </>
            )}
          </div>
        </div>
        <DataTable
          columns={columns}
          data={vendors}
          loading={loading}
          emptyMessage="No vendors found"
          onRowClick={(row) => router.push(`/vendors/${(row as Vendor).id}`)}
          renderCard={(row) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <Phone size={13} />
                    {row.phone}
                  </p>
                </div>
                {row.isActive
                  ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                  : <Badge className="bg-gray-100 text-gray-500">Archived</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">City</p>
                  <p className="mt-1 text-slate-700">{row.city || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Lead time</p>
                  <p className="mt-1 text-slate-700">{row.standardLeadDays}d</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Material</p>
                <p className="mt-1 text-sm text-slate-700">{row.materialSupplied || "—"}</p>
              </div>
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {row._count.vendorRequests} requests
              </span>
            </div>
          )}
        />
        <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingVendorId ? "Edit Vendor" : "Add New Vendor"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Vendor Name *" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Phone *" required value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210" />
            <Input label="WhatsApp Number" value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              placeholder="Same as phone if same" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="City" value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Standard Lead Time (days)" type="number" min={1}
              value={form.standardLeadDays}
              onChange={(e) => setForm({ ...form, standardLeadDays: parseInt(e.target.value) || 7 })} />
          </div>
          <Input label="Material / Items Supplied" value={form.materialSupplied}
            onChange={(e) => setForm({ ...form, materialSupplied: e.target.value })}
            placeholder="e.g. Silver castings, semi-finished idols" />
          <Textarea label="Notes" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingVendorId ? "Save Changes" : "Save Vendor"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
