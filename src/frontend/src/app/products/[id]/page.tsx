"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { Product } from "@/types/product";
import { ProductTemplateDto } from "@/types/operational";
import { LabelTemplate } from "@/types/template";
import Link from "next/link";

export default function ProductDetailPage() {
    const { id } = useParams();
    const [product, setProduct] = useState<Product | null>(null);
    const [links, setLinks] = useState<ProductTemplateDto[]>([]);
    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [isDefault, setIsDefault] = useState(false);

    const load = async () => {
        try {
            const [pRes, lRes, tRes] = await Promise.all([
                apiFetch<Product>(`/api/Products/${id}`),
                apiFetch<ProductTemplateDto[]>(`/api/Products/${id}/Templates`),
                apiFetch<LabelTemplate[]>(`/api/Templates`)
            ]);

            if (pRes.success) setProduct(pRes.data);
            if (lRes.success) setLinks(lRes.data);
            if (tRes.success) setTemplates(tRes.data);
        } catch (err) {
            console.error("Failed to load product data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [id]);

    const handleLink = async () => {
        if (!selectedTemplateId) return;
        try {
            const res = await apiFetch(`/api/Products/${id}/Templates`, {
                method: 'POST',
                body: JSON.stringify({ templateId: selectedTemplateId, isDefault }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.success) {
                setShowLinkModal(false);
                await load();
            } else {
                alert("Link failed: " + ((res as any).error?.message || "Unknown error"));
            }
        } catch (err) {
            alert("Linking failed.");
        }
    };

    const handleSetDefault = async (linkId: string) => {
        try {
            const res = await apiFetch(`/api/Products/${id}/Templates/${linkId}/set-default`, {
                method: 'POST'
            });
            if (res.success) await load();
        } catch (err) {
            alert("Failed to set default.");
        }
    };

    const handleUnlink = async (linkId: string) => {
        if (!confirm("Are you sure you want to remove this template association?")) return;
        try {
            const res = await apiFetch(`/api/Products/${id}/Templates/${linkId}`, {
                method: 'DELETE'
            });
            if (res.success) await load();
        } catch (err) {
            alert("Failed to unlink.");
        }
    };

    const handlePrintIntent = async (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (!template || !template.currentActiveVersionId) {
            alert("No published version available for this template.");
            return;
        }

        const qtyStr = prompt("Enter print quantity:", "1");
        if (qtyStr === null) return;
        const quantity = parseInt(qtyStr);
        if (isNaN(quantity) || quantity <= 0) {
            alert("Invalid quantity.");
            return;
        }

        try {
            const res = await apiFetch(`/api/PrintIntents`, {
                method: 'POST',
                body: JSON.stringify({
                    productId: id,
                    templateId: templateId,
                    versionId: template.currentActiveVersionId,
                    quantity
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.success) {
                alert("Print intent created successfully.");
            } else {
                alert("Failed to create print intent: " + ((res as any).error?.message || "Unknown error"));
            }
        } catch (err) {
            alert("Error creating print intent.");
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!product) return <div className="p-8">Product not found.</div>;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                    <Link href="/products" className="hover:text-blue-600">Products</Link>
                    <span>/</span>
                    <span>{product.sku}</span>
                </div>

                <div className="bg-white border rounded-lg p-6 shadow-sm mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                            <p className="text-gray-600 font-mono">SKU: {product.sku}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {product.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                        <div>
                            <span className="text-gray-500 block">Category</span>
                            <span className="font-medium">{product.categoryName || "-"}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Vendor</span>
                            <span className="font-medium">{product.vendorName || "-"}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700">Linked Label Templates</h3>
                                <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                    <button
                                        onClick={() => setShowLinkModal(true)}
                                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-bold"
                                    >
                                        + Link Template
                                    </button>
                                </RoleGuard>
                            </div>
                            <div className="p-0">
                                {links.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 italic">
                                        No templates associated with this product.
                                    </div>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500">
                                            <tr>
                                                <th className="px-6 py-3 text-left">Code</th>
                                                <th className="px-6 py-3 text-left">Name</th>
                                                <th className="px-6 py-3 text-center">Default</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {links.map((link) => (
                                                <tr key={link.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">{link.templateCode}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{link.templateName}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {link.isDefault ? (
                                                            <span className="text-emerald-600 font-bold text-xs">★ Default</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleSetDefault(link.id)}
                                                                className="text-gray-400 hover:text-emerald-600 text-xs"
                                                            >
                                                                Set Default
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                                                        <button
                                                            onClick={() => handlePrintIntent(link.templateId)}
                                                            className="text-blue-600 hover:text-blue-800 text-sm font-bold"
                                                        >
                                                            Intent-to-Print
                                                        </button>
                                                        <RoleGuard allowedRoles={["Admin"]}>
                                                            <button
                                                                onClick={() => handleUnlink(link.id)}
                                                                className="text-red-400 hover:text-red-600 text-sm"
                                                            >
                                                                Unlink
                                                            </button>
                                                        </RoleGuard>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-6">
                            <h3 className="font-semibold text-emerald-800 mb-2">Operational Tip</h3>
                            <p className="text-xs text-emerald-700 leading-relaxed">
                                Linking a template allows you to capture print intentions for this product.
                                The "Default" template will be pre-selected in high-volume operations.
                            </p>
                        </div>
                    </div>
                </div>

                {showLinkModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                            <h3 className="text-lg font-bold mb-4">Link New Template</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
                                    <select
                                        className="w-full border rounded p-2 text-sm"
                                        value={selectedTemplateId}
                                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                                    >
                                        <option value="">-- Select Template --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={isDefault}
                                        onChange={(e) => setIsDefault(e.target.checked)}
                                    />
                                    <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">Set as Default Template</label>
                                </div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        onClick={() => setShowLinkModal(false)}
                                        className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleLink}
                                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-bold"
                                    >
                                        Link Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
