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
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

interface Customer {
  id: string;
  partyName: string;
  phone: string;
  city: string | null;
  gstNumber: string | null;
  isActive: boolean;
  _count: { orders: number };
}

const emptyForm = { partyName: "", phone: "", city: "", address: "", gstNumber: "", notes: "" };
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const { showToast } = useToast();

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: String(page),
        limit: String(PAGE_SIZE),
        includeInactive: String(showInactive),
      });
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      if (!active) return;
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setSelectedCustomerIds([]);
      setLoading(false);
    }

    void loadCustomers();
    return () => {
      active = false;
    };
  }, [debouncedSearch, showInactive, page]);

  async function refreshCustomers() {
    setLoading(true);
    const params = new URLSearchParams({
      search: debouncedSearch,
      page: String(page),
      limit: String(PAGE_SIZE),
      includeInactive: String(showInactive),
    });
    const res = await fetch(`/api/customers?${params}`);
    const data = await res.json();
    setCustomers(data.customers || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const response = await fetch(editingCustomerId ? `/api/customers/${editingCustomerId}` : "/api/customers", {
      method: editingCustomerId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showToast({
        tone: "error",
        title: editingCustomerId ? "Customer update failed" : "Customer creation failed",
        description: error.error || "Please review the customer details and try again.",
      });
      setSaving(false);
      return;
    }
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    setEditingCustomerId(null);
    showToast({
      title: editingCustomerId ? "Customer updated" : "Customer created",
      description: form.partyName,
    });
    await refreshCustomers();
  }

  async function handleArchive(customer: Customer) {
    const response = await fetch(`/api/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !customer.isActive }),
    });
    if (!response.ok) {
      showToast({
        tone: "error",
        title: "Customer status update failed",
        description: `Could not ${customer.isActive ? "archive" : "restore"} ${customer.partyName}.`,
      });
      return;
    }
    showToast({
      title: customer.isActive ? "Customer archived" : "Customer restored",
      description: customer.partyName,
    });
    await refreshCustomers();
  }

  async function handleBulkArchive(nextActiveState: boolean) {
    await Promise.all(
      selectedCustomerIds.map((customerId) =>
        fetch(`/api/customers/${customerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextActiveState }),
        })
      )
    );
    setSelectedCustomerIds([]);
    showToast({
      title: nextActiveState ? "Customers restored" : "Customers archived",
      description: `${selectedCustomerIds.length} records updated.`,
    });
    await refreshCustomers();
  }

  async function handleEdit(customer: Customer) {
    const response = await fetch(`/api/customers/${customer.id}`);
    const detail = await response.json();
    setEditingCustomerId(customer.id);
    setForm({
      partyName: detail.partyName,
      phone: detail.phone,
      city: detail.city || "",
      address: detail.address || "",
      gstNumber: detail.gstNumber || "",
      notes: detail.notes || "",
    });
    setModalOpen(true);
  }

  function toggleCustomerSelection(customerId: string) {
    setSelectedCustomerIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId]
    );
  }

  const areAllVisibleSelected =
    customers.length > 0 && customers.every((customer) => selectedCustomerIds.includes(customer.id));

  const columns = [
    { key: "select", header: "", render: (row: Customer) => (
      <div onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={selectedCustomerIds.includes(row.id)}
          onChange={() => toggleCustomerSelection(row.id)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
        />
      </div>
    ), className: "w-12" },
    { key: "partyName", header: "Party Name", render: (row: Customer) => (
      <span className="font-medium text-gray-900">{row.partyName}</span>
    )},
    { key: "phone", header: "Phone", render: (row: Customer) => (
      <span className="flex items-center gap-1 text-gray-600">
        <Phone size={13} /> {row.phone}
      </span>
    )},
    { key: "city", header: "City", render: (row: Customer) => row.city || "—" },
    { key: "gstNumber", header: "GST", render: (row: Customer) => row.gstNumber || "—" },
    { key: "orders", header: "Orders", render: (row: Customer) => (
      <span className="text-gray-600">{row._count.orders}</span>
    )},
    { key: "status", header: "Status", render: (row: Customer) => (
      row.isActive
        ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
        : <Badge className="bg-gray-100 text-gray-500">Archived</Badge>
    )},
    { key: "actions", header: "", render: (row: Customer) => (
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
        title={`Customers (${total})`}
        description="Manage customer accounts with archive, restore, edit, and bulk cleanup controls."
        actions={
          <Button onClick={() => {
            setEditingCustomerId(null);
            setForm(emptyForm);
            setModalOpen(true);
          }}>
            <Plus size={16} /> Add Customer
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <SearchInput
              placeholder="Search by name, phone, city…"
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
                  setSelectedCustomerIds(areAllVisibleSelected ? [] : customers.map((customer) => customer.id))
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              Select all
            </label>
            {selectedCustomerIds.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => void handleBulkArchive(false)}>
                  <Trash2 size={14} /> Archive Selected ({selectedCustomerIds.length})
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
          data={customers}
          loading={loading}
          emptyMessage="No customers found"
          onRowClick={(row) => router.push(`/customers/${(row as Customer).id}`)}
          renderCard={(row) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{row.partyName}</p>
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
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">GST</p>
                  <p className="mt-1 text-slate-700">{row.gstNumber || "—"}</p>
                </div>
              </div>
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {row._count.orders} orders
              </span>
              <div
                className="flex flex-wrap gap-2 pt-1"
                onClick={(event) => event.stopPropagation()}
              >
                <Button type="button" variant="ghost" size="sm" onClick={() => void handleEdit(row)}>
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
            </div>
          )}
        />
        <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCustomerId ? "Edit Customer" : "Add New Customer"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Party Name *"
            required
            value={form.partyName}
            onChange={(e) => setForm({ ...form, partyName: e.target.value })}
            placeholder="e.g. Rajesh Jewellers"
          />
          <Input
            label="Phone *"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 98765 43210"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Jaipur"
            />
            <Input
              label="GST Number"
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              placeholder="27ABCDE1234F1Z5"
            />
          </div>
          <Textarea
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Full address"
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any special notes"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>{editingCustomerId ? "Save Changes" : "Save Customer"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
