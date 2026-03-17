"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { Product } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ProductsPage() {
    const { formatDate, t } = useI18n();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        async function load() {
            const res = await apiFetch<Product[]>("/api/Products");
            if (res.success) {
                setProducts(res.data);
            }
            setLoading(false);
        }

        load();
    }, []);

    const filteredProducts = useMemo(
        () =>
            products.filter((product) =>
                [product.sku, product.name, product.categoryName ?? "", product.vendorName ?? ""]
                    .join(" ")
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
            ),
        [products, searchTerm]
    );

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow={t("products.eyebrow")}
                    title={t("products.title")}
                    description={t("products.description")}
                    actions={
                        <>
                            <Link href="/products/import" className="plms-button-secondary">
                                {t("products.csvImport")}
                            </Link>
                            <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <Link href="/products/new" className="plms-button-primary">
                                    {t("products.newProduct")}
                                </Link>
                            </RoleGuard>
                        </>
                    }
                />

                <FilterBar
                    left={
                        <input
                            className="plms-input max-w-xl"
                            placeholder={t("products.searchPlaceholder")}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    }
                    right={
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                            {t("products.visible", undefined, { count: filteredProducts.length })}
                        </div>
                    }
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <EmptyState
                        title={t("products.emptyTitle")}
                        description={t("products.emptyDescription")}
                        action={
                            <Link href="/products/import" className="plms-button-primary">
                                {t("products.openImportWorkflow")}
                            </Link>
                        }
                    />
                ) : (
                    <DataTable columns={[t("products.table.sku"), t("products.table.product"), t("products.table.category"), t("products.table.vendor"), t("products.table.status"), t("products.table.created"), t("products.table.open")]}>
                        {filteredProducts.map((product) => (
                            <tr key={product.id} className="bg-transparent transition-colors hover:bg-white/5">
                                <td className="px-6 py-4">
                                    <span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">
                                        {product.sku}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-white">{product.name}</div>
                                    <div className="mt-1 text-xs text-[color:var(--plms-text-subtle)]">
                                        {product.description || t("products.noDescription")}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">
                                    {product.categoryName || "-"}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">
                                    {product.vendorName || "-"}
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge label={product.isActive ? "Active" : "Inactive"} tone={product.isActive ? "success" : "danger"} />
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-subtle)]">
                                    {formatDate(product.createdAt)}
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/products/${product.id}`} className="text-xs font-black uppercase tracking-[0.22em] text-blue-300 hover:text-blue-200">
                                        {t("common.open")}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}
            </div>
        </RoleGuard>
    );
}
