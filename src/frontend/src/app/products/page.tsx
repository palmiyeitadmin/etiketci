"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { Product } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ProductsPage() {
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
                    eyebrow="Product governance"
                    title="Products"
                    description="Industrial product catalog, category linkage and vendor readiness in a single operational registry."
                    actions={
                        <>
                            <Link href="/products/import" className="plms-button-secondary">
                                CSV Import
                            </Link>
                            <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <Link href="/products/new" className="plms-button-primary">
                                    New Product
                                </Link>
                            </RoleGuard>
                        </>
                    }
                />

                <FilterBar
                    left={
                        <input
                            className="plms-input max-w-xl"
                            placeholder="Search by SKU, product name, category or vendor"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    }
                    right={
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                            {filteredProducts.length} visible
                        </div>
                    }
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <EmptyState
                        title="No products matched this filter"
                        description="Try a broader search or import product data from the CSV workflow."
                        action={
                            <Link href="/products/import" className="plms-button-primary">
                                Open Import Workflow
                            </Link>
                        }
                    />
                ) : (
                    <DataTable columns={["SKU", "Product", "Category", "Vendor", "Status", "Created", "Open"]}>
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
                                        {product.description || "No description"}
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
                                    {new Date(product.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/products/${product.id}`} className="text-xs font-black uppercase tracking-[0.22em] text-blue-300 hover:text-blue-200">
                                        Open
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
