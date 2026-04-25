"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { FINISH_TYPE_LABELS } from "@/lib/constants";
import { useToast } from "@/lib/toast-context";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
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
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const emptyForm = {
  sku: "", name: "", category: "", defaultSize: "", finishType: "PLAIN" as FinishType,
  defaultLeadTimeDays: 7, rawMaterialRequired: false,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(search, 300);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: String(page),
        limit: String(PAGE_SIZE),
        includeInactive: String(showInactive),
      });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (!active) return;
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setSelectedProductIds([]);
      setLoading(false);
    }

    void loadProducts();
    return () => {
      active = false;
    };
  }, [debouncedSearch, showInactive, page]);

  async function refreshProducts() {
    setLoading(true);
    const params = new URLSearchParams({
      search: debouncedSearch,
      page: String(page),
      limit: String(PAGE_SIZE),
      includeInactive: String(showInactive),
    });
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const response = await fetch(editingProductId ? `/api/products/${editingProductId}` : "/api/products", {
      method: editingProductId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showToast({
        tone: "error",
        title: editingProductId ? "Product update failed" : "Product creation failed",
        description: error.error || "Please review the form and try again.",
      });
      setSaving(false);
      return;
    }
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    setEditingProductId(null);
    showToast({
      title: editingProductId ? "Product updated" : "Product created",
      description: `${form.name} is ready for use in orders and vendor requests.`,
    });
    await refreshProducts();
  }

  async function handleArchive(product: Product) {
    const response = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !product.isActive }),
    });
    if (!response.ok) {
      showToast({
        tone: "error",
        title: "Product status update failed",
        description: `Could not ${product.isActive ? "archive" : "restore"} ${product.name}.`,
      });
      return;
    }
    showToast({
      title: product.isActive ? "Product archived" : "Product restored",
      description: product.name,
    });
    await refreshProducts();
  }

  async function handleBulkArchive(nextActiveState: boolean) {
    await Promise.all(
      selectedProductIds.map((productId) =>
        fetch(`/api/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextActiveState }),
        })
      )
    );
    setSelectedProductIds([]);
    showToast({
      title: nextActiveState ? "Products restored" : "Products archived",
      description: `${selectedProductIds.length} records updated.`,
    });
    await refreshProducts();
  }

  async function handleEdit(product: Product) {
    const response = await fetch(`/api/products/${product.id}`);
    const detail = await response.json();
    setEditingProductId(product.id);
    setForm({
      sku: detail.sku,
      name: detail.name,
      category: detail.category,
      defaultSize: detail.defaultSize || "",
      finishType: detail.finishType,
      defaultLeadTimeDays: detail.defaultLeadTimeDays,
      rawMaterialRequired: detail.rawMaterialRequired,
    });
    setModalOpen(true);
  }

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  const areAllVisibleSelected =
    products.length > 0 && products.every((product) => selectedProductIds.includes(product.id));

  const columns = [
    { key: "select", header: "", render: (row: Product) => (
      <div onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={selectedProductIds.includes(row.id)}
          onChange={() => toggleProductSelection(row.id)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
        />
      </div>
    ), className: "w-12" },
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
    { key: "status", header: "Status", render: (row: Product) => (
      row.isActive
        ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
        : <Badge className="bg-gray-100 text-gray-500">Archived</Badge>
    )},
    { key: "actions", header: "", render: (row: Product) => (
      <div className="flex items-center justify-end gap-2">
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
        title={`Products (${total})`}
        description="Silver product catalogue with archive, restore, edit and bulk cleanup support."
        actions={
          <Button onClick={() => {
            setEditingProductId(null);
            setForm(emptyForm);
            setModalOpen(true);
          }}>
            <Plus size={16} /> Add Product
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <SearchInput
              placeholder="Search SKU, name, category…"
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
            <div onClick={(event) => event.stopPropagation()}>
              <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={areAllVisibleSelected}
                  onChange={() =>
                    setSelectedProductIds(areAllVisibleSelected ? [] : products.map((product) => product.id))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                Select all
              </label>
            </div>
            {selectedProductIds.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => void handleBulkArchive(false)}>
                  <Trash2 size={14} /> Archive Selected ({selectedProductIds.length})
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
          data={products}
          loading={loading}
          emptyMessage="No products found"
          renderCard={(row) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-400">{row.sku}</p>
                </div>
                {row.isActive
                  ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                  : <Badge className="bg-gray-100 text-gray-500">Archived</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Category</p>
                  <p className="mt-1 text-slate-700">{row.category}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Lead time</p>
                  <p className="mt-1 text-slate-700">{row.defaultLeadTimeDays}d</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-slate-100 text-slate-700">{FINISH_TYPE_LABELS[row.finishType]}</Badge>
                {row.rawMaterialRequired
                  ? <Badge className="bg-yellow-100 text-yellow-700">Raw material required</Badge>
                  : <Badge className="bg-gray-100 text-gray-500">No raw material</Badge>}
              </div>
            </div>
          )}
        />
        <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProductId ? "Edit Product" : "Add New Product"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="SKU / Item Code *"
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="AG-GANESH-4IN"
              disabled={Boolean(editingProductId)}
            />
            <Input
              label="Product Name *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Silver Ganesh Idol 4 inch"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Button type="submit" loading={saving}>{editingProductId ? "Save Changes" : "Save Product"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
