"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { ProductCategory, Vendor } from "@/types/product";

type ProductFormState = {
    sku: string;
    name: string;
    description: string;
    categoryId: string;
    vendorId: string;
    isActive: boolean;
};

const initialFormState: ProductFormState = {
    sku: "",
    name: "",
    description: "",
    categoryId: "",
    vendorId: "",
    isActive: true,
};

function getErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== "object") return fallback;

    const errorRecord = error as Record<string, unknown>;
    if (typeof errorRecord.message === "string" && errorRecord.message.trim()) {
        return errorRecord.message;
    }

    return fallback;
}

export default function NewProductPage() {
    const router = useRouter();
    const [form, setForm] = useState<ProductFormState>(initialFormState);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadOptions() {
            try {
                const [categoryRes, vendorRes] = await Promise.all([
                    apiFetch<ProductCategory[]>("/api/categories"),
                    apiFetch<Vendor[]>("/api/Vendors"),
                ]);

                if (categoryRes.success) {
                    setCategories(categoryRes.data.filter((category) => category.isActive));
                }

                if (vendorRes.success) {
                    setVendors(vendorRes.data.filter((vendor) => vendor.isActive));
                }
            } catch {
                setError("Reference data could not be loaded.");
            } finally {
                setLoading(false);
            }
        }

        loadOptions();
    }, []);

    const handleChange = (field: keyof ProductFormState, value: string | boolean) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);

        const payload = {
            sku: form.sku.trim(),
            name: form.name.trim(),
            description: form.description.trim(),
            categoryId: form.categoryId || null,
            vendorId: form.vendorId || null,
            isActive: form.isActive,
        };

        const response = await apiFetch<{ id: string }>("/api/Products", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        if (response.success) {
            router.push(`/products/${response.data.id}`);
            return;
        }

        setError(getErrorMessage(response.error, "Product could not be created."));
        setSaving(false);
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="max-w-3xl mx-auto p-8 space-y-8">
                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <Link href="/products" className="hover:text-blue-600 transition-colors">Products</Link>
                    <span>/</span>
                    <span className="text-slate-900">New Product</span>
                </div>

                <div className="space-y-3">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Create Product</h1>
                    <p className="text-sm text-slate-500 max-w-2xl">Register a product master record, then attach one or more label templates from the product detail screen.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-8 space-y-6">
                    {error && (
                        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-10 text-center text-sm font-bold text-slate-500">Loading reference data...</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU</span>
                                    <input
                                        value={form.sku}
                                        onChange={(e) => handleChange("sku", e.target.value)}
                                        required
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                                        placeholder="PRD-001"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</span>
                                    <input
                                        value={form.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        required
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                                        placeholder="Product name"
                                    />
                                </label>
                            </div>

                            <label className="space-y-2 block">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</span>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                    rows={4}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                                    placeholder="Operational context, packaging details, or regulatory notes"
                                />
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</span>
                                    <select
                                        value={form.categoryId}
                                        onChange={(e) => handleChange("categoryId", e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">No category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.code} - {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</span>
                                    <select
                                        value={form.vendorId}
                                        onChange={(e) => handleChange("vendorId", e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">No vendor</option>
                                        {vendors.map((vendor) => (
                                            <option key={vendor.id} value={vendor.id}>
                                                {vendor.code} - {vendor.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <label className="flex items-center space-x-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => handleChange("isActive", e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300"
                                />
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-900">Active record</div>
                                    <div className="text-xs text-slate-500">Inactive products stay in the catalog but should not be used operationally.</div>
                                </div>
                            </label>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Link
                                    href="/products"
                                    className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                                >
                                    {saving ? "Creating..." : "Create Product"}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </RoleGuard>
    );
}

