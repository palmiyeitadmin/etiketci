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
    const { formatDate, t, locale } = useI18n();
    const searchPlaceholder = locale === "tr" ? "Ara" : "Search";
    const csvImportLabel = locale === "tr" ? "CSV içe aktar" : "Import CSV";
    const newProductLabel = locale === "tr" ? "Yeni ürün" : "New product";
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
            <div className="space-y-6">
                <PageHeader
                    title={t("products.title")}
                    description={t("products.description")}
                    actions={
                        <>
                            <Link href="/products/import" className="plms-button-secondary">
                                {csvImportLabel}
                            </Link>
                            <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <Link href="/products/new" className="plms-button-primary">
                                    {newProductLabel}
                                </Link>
                            </RoleGuard>
                        </>
                    }
                />

                <FilterBar
                    left={
                        <input
                            className="plms-input max-w-sm"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    }
                    right={
                        <div className="tabular text-sm text-ink-3">
                            {locale === "tr" ? `${filteredProducts.length} ürün` : `${filteredProducts.length} products`}
                        </div>
                    }
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <EmptyState
                        title={t("products.emptyTitle")}
                        description={t("products.emptyDescription")}
                        action={
                            <Link href="/products/import" className="plms-button-primary">
                                {csvImportLabel}
                            </Link>
                        }
                    />
                ) : (
                    <DataTable columns={[t("products.table.sku"), t("products.table.product"), t("products.table.category"), t("products.table.vendor"), t("products.table.status"), t("products.table.created"), ""]}>
                        {filteredProducts.map((product) => (
                            <tr key={product.id} className="transition-colors hover:bg-raised">
                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">
                                    {product.sku}
                                </td>
                                <td className="px-4 py-2.5 text-base">
                                    <Link href={`/products/${product.id}`} className="text-ink transition-colors hover:text-accent">
                                        {product.name}
                                    </Link>
                                    {product.description && product.description !== product.name ? (
                                        <div className="text-sm text-ink-3">{product.description}</div>
                                    ) : null}
                                </td>
                                <td className="px-4 py-2.5 text-base text-ink-2">
                                    {product.categoryName || "–"}
                                </td>
                                <td className="px-4 py-2.5 text-base text-ink-2">
                                    {product.vendorName || "–"}
                                </td>
                                <td className="px-4 py-2.5">
                                    <StatusBadge label={product.isActive ? "Active" : "Inactive"} tone={product.isActive ? "success" : "danger"} />
                                </td>
                                <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-3">
                                    {formatDate(product.createdAt)}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <Link href={`/products/${product.id}`} className="plms-button-compact">
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
