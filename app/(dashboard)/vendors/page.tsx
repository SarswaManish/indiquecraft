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

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/vendors?search=${encodeURIComponent(debouncedSearch)}`);
    const data = await res.json();
    setVendors(data.vendors || []);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    fetchVendors();
  }

  const columns = [
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
  ];

  return (
    <div>
      <PageHeader
        title={`Vendors (${vendors.length})`}
        description="Raw material and semi-finished goods suppliers"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Add Vendor
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <SearchInput
            placeholder="Search vendor name, city, material…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <DataTable
          columns={columns}
          data={vendors}
          loading={loading}
          emptyMessage="No vendors found"
          onRowClick={(row) => router.push(`/vendors/${(row as Vendor).id}`)}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Vendor" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Vendor Name *" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone *" required value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210" />
            <Input label="WhatsApp Number" value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              placeholder="Same as phone if same" />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <Button type="submit" loading={saving}>Save Vendor</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
