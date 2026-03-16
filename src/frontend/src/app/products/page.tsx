"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { Product } from "@/types/product";
import Link from "next/link";

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

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

    const filteredProducts = products.filter(p =>
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.categoryName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8 max-w-7xl mx-auto">
                {/* Action Header */}
                <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Product Catalog</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage industrial product data and variable mappings.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Link
                            href="/products/import"
                            className="bg-emerald-600 text-white px-4 py-2 rounded font-semibold hover:bg-emerald-700 shadow-sm transition-colors text-sm"
                        >
                            CSV Import
                        </Link>
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <button className="bg-slate-800 text-white px-4 py-2 rounded font-semibold hover:bg-slate-900 shadow-sm transition-colors text-sm">
                                New Product
                            </button>
                        </RoleGuard>
                    </div>
                </div>

                {/* Filters & Tools */}
                <div className="mb-6 flex justify-between items-center">
                    <div className="relative w-full max-w-sm">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search by SKU, Name or Category..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                        Displaying {filteredProducts.length} Products
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-slate-500 font-medium">Loading Product Data...</span>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">SKU</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Product Information</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Vendor</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Created</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="text-slate-300 mb-2">
                                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                                </div>
                                                <p className="text-slate-500 font-medium">No products match your criteria.</p>
                                                <p className="text-slate-400 text-xs mt-1">Try adjusting your search or use CSV Import.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((p) => (
                                        <tr
                                            key={p.id}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                            onClick={() => window.location.href = `/products/${p.id}`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    {p.sku}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                                                <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.description || "No description provided."}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {p.categoryName ? (
                                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">
                                                        {p.categoryName}
                                                    </span>
                                                ) : "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {p.vendorName || "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${p.isActive
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                    {p.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right font-mono">
                                                {new Date(p.createdAt).toLocaleDateString()}
                                            </td>
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

