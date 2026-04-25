"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { FINISH_TYPE_LABELS } from "@/lib/constants";
import { FinishType } from "@prisma/client";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  finishType: FinishType;
  defaultLeadTimeDays: number;
  rawMaterialRequired: boolean;
  isActive: boolean;
}

const finishOptions = Object.entries(FINISH_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const emptyForm = {
  sku: "", name: "", category: "", defaultSize: "", finishType: "PLAIN" as FinishType,
  defaultLeadTimeDays: 7, rawMaterialRequired: false,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      const res = await fetch(`/api/products?search=${encodeURIComponent(debouncedSearch)}`);
      const data = await res.json();
      if (!active) return;
      setProducts(data.products || []);
      setLoading(false);
    }

    void loadProducts();
    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    setLoading(true);
    const res = await fetch(`/api/products?search=${encodeURIComponent(debouncedSearch)}`);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }

  const columns = [
    { key: "sku", header: "SKU", render: (row: Product) => (
      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{row.sku}</span>
    )},
    { key: "name", header: "Product Name", render: (row: Product) => (
      <span className="font-medium text-gray-900">{row.name}</span>
    )},
    { key: "category", header: "Category" },
    { key: "finishType", header: "Finish", render: (row: Product) => (
      <span className="text-sm text-gray-600">{FINISH_TYPE_LABELS[row.finishType]}</span>
    )},
    { key: "defaultLeadTimeDays", header: "Lead Time", render: (row: Product) => `${row.defaultLeadTimeDays}d` },
    { key: "rawMaterialRequired", header: "Raw Matl.", render: (row: Product) => (
      row.rawMaterialRequired
        ? <Badge className="bg-yellow-100 text-yellow-700">Required</Badge>
        : <Badge className="bg-gray-100 text-gray-500">No</Badge>
    )},
  ];

  return (
    <div>
      <PageHeader
        title={`Products (${products.length})`}
        description="Silver product catalogue"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Add Product
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <SearchInput
            placeholder="Search SKU, name, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          emptyMessage="No products found"
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Product" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU / Item Code *"
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="AG-GANESH-4IN"
            />
            <Input
              label="Product Name *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Silver Ganesh Idol 4 inch"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Category *"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Idols, Jewellery, Utensils…"
            />
            <Input
              label="Default Size"
              value={form.defaultSize}
              onChange={(e) => setForm({ ...form, defaultSize: e.target.value })}
              placeholder="4 inch"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Finish Type"
              value={form.finishType}
              options={finishOptions}
              onChange={(e) => setForm({ ...form, finishType: e.target.value as FinishType })}
            />
            <Input
              label="Lead Time (days)"
              type="number"
              min={1}
              value={form.defaultLeadTimeDays}
              onChange={(e) => setForm({ ...form, defaultLeadTimeDays: parseInt(e.target.value) || 7 })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rawMaterialRequired"
              checked={form.rawMaterialRequired}
              onChange={(e) => setForm({ ...form, rawMaterialRequired: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600"
            />
            <label htmlFor="rawMaterialRequired" className="text-sm text-gray-700">
              Requires raw material / semi-finished goods from vendor
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Product</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
