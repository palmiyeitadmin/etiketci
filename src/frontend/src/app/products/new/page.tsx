"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useText } from "@/lib/i18n";
import { ProductCategory, Vendor } from "@/types/product";
import { CaretRight } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";

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
    const text = useText("products").create;
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
                setError(text.referenceLoadFailed);
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

        setError(getErrorMessage(response.error, text.createFailed));
        setSaving(false);
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="space-y-6">
                <nav className="-mb-3 flex items-center gap-1.5 text-sm text-ink-3">
                    <Link href="/products" className="transition-colors hover:text-ink">{text.parent}</Link>
                    <CaretRight size={12} aria-hidden />
                    <span className="text-ink-2">{text.title}</span>
                </nav>

                <PageHeader title={text.title} description={text.description} />

                <form onSubmit={handleSubmit} className="plms-card max-w-2xl space-y-5 p-6">
                    {error && (
                        <div className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-10 text-center text-sm text-ink-3">{text.loading}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="flex flex-col gap-1.5">
                                    <span className="plms-label">{text.sku}</span>
                                    <input
                                        value={form.sku}
                                        onChange={(e) => handleChange("sku", e.target.value)}
                                        required
                                        className="plms-input font-mono"
                                        placeholder="ZYT-0500-SZM"
                                    />
                                </label>

                                <label className="flex flex-col gap-1.5">
                                    <span className="plms-label">{text.name}</span>
                                    <input
                                        value={form.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        required
                                        className="plms-input"
                                        placeholder={text.namePlaceholder}
                                    />
                                </label>
                            </div>

                            <label className="flex flex-col gap-1.5">
                                <span className="plms-label">{text.descriptionLabel}</span>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                    rows={4}
                                    className="plms-input"
                                    placeholder={text.descriptionPlaceholder}
                                />
                            </label>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="flex flex-col gap-1.5">
                                    <span className="plms-label">{text.category}</span>
                                    <select
                                        value={form.categoryId}
                                        onChange={(e) => handleChange("categoryId", e.target.value)}
                                        className="plms-select w-full"
                                    >
                                        <option value="">{text.noCategory}</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.code} - {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1.5">
                                    <span className="plms-label">{text.vendor}</span>
                                    <select
                                        value={form.vendorId}
                                        onChange={(e) => handleChange("vendorId", e.target.value)}
                                        className="plms-select w-full"
                                    >
                                        <option value="">{text.noVendor}</option>
                                        {vendors.map((vendor) => (
                                            <option key={vendor.id} value={vendor.id}>
                                                {vendor.code} - {vendor.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => handleChange("isActive", e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-line accent-accent"
                                />
                                <span className="flex flex-col gap-0.5">
                                    <span className="text-sm text-ink">{text.activeRecord}</span>
                                    <span className="text-sm text-ink-3">{text.activeRecordDescription}</span>
                                </span>
                            </label>

                            <div className="flex justify-end gap-2 border-t border-line pt-5">
                                <Link href="/products" className="plms-button-secondary">
                                    {text.cancel}
                                </Link>
                                <button type="submit" disabled={saving} className="plms-button-primary">
                                    {saving ? text.creating : text.create}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </RoleGuard>
    );
}
