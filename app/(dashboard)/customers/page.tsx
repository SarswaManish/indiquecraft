"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Phone } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

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

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers?search=${encodeURIComponent(debouncedSearch)}`);
    const data = await res.json();
    setCustomers(data.customers || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    fetchCustomers();
  }

  const columns = [
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
  ];

  return (
    <div>
      <PageHeader
        title={`Customers (${total})`}
        description="Manage retail and wholesale customer accounts"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Add Customer
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <SearchInput
            placeholder="Search by name, phone, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <DataTable
          columns={columns}
          data={customers}
          loading={loading}
          emptyMessage="No customers found"
          onRowClick={(row) => router.push(`/customers/${(row as Customer).id}`)}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Customer">
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
          <div className="grid grid-cols-2 gap-3">
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
            <Button type="submit" loading={saving}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
