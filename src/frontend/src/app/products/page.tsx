"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { Product } from "@/types/product";
import Link from "next/link";

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch<Product[]>("/api/Products");
                if (res.success && res.data) {
                    setProducts(res.data);
                }
            } catch (err) {
                console.error("Failed to load products", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Product Catalog</h1>
                    <div className="space-x-4">
                        <Link
                            href="/products/import"
                            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
                        >
                            CSV Import
                        </Link>
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                New Product
                            </button>
                        </RoleGuard>
                    </div>
                </div>

                {loading ? (
                    <p>Loading products...</p>
                ) : (
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500 italic">No products found. Use CSV Import to seed data.</td>
                                    </tr>
                                ) : (
                                    products.map((p) => (
                                        <tr key={p.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{p.sku}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{p.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.categoryName || "-"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.vendorName || "-"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {p.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
