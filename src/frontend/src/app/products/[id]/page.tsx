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
    const router = useRouter();
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

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-900">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400"></div>
        </div>
    );
    if (!product) return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Master Record Loss: Product Not Found.</div>;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8 max-w-6xl mx-auto space-y-10">
                
                {/* Industrial Header & Snapshot */}
                <div className="bg-slate-900 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute right-[-40px] top-[-40px] font-black text-[120px] text-white/5 italic select-none pointer-events-none tracking-tighter">PRODUCT</div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-6">
                            <Link href="/products" className="hover:text-emerald-400 transition-colors">Catalog</Link>
                            <span>/</span>
                            <span className="text-white">Master Record</span>
                        </div>

                        <div className="flex justify-between items-start">
                            <div className="space-y-4">
                                <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">{product.name}</h1>
                                <div className="flex items-center space-x-4">
                                    <span className="font-mono text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-400">SKU_{product.sku}</span>
                                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center space-x-2 ${
                                        product.isActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${product.isActive ? "bg-emerald-500" : "bg-red-500"}`}></span>
                                        <span>{product.isActive ? "Operational" : "Suspended"}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-end space-y-2">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Classification</div>
                                <div className="text-sm font-black text-white px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                                    {product.categoryName || "UNCATEGORIZED"}
                                </div>
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-4">Origin Vendor</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-tight"> {product.vendorName || "DIRECT_PROMPT"}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    
                    {/* Linkage Map */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                            <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Template Linkage Map</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Authorized Label associations</p>
                                </div>
                                <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                    <button
                                        onClick={() => setShowLinkModal(true)}
                                        className="bg-slate-900 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                                    >
                                        + Association
                                    </button>
                                </RoleGuard>
                            </div>
                            
                            <div className="p-0">
                                {links.length === 0 ? (
                                    <div className="p-16 text-center">
                                        <div className="text-4xl mb-4 grayscale opacity-20">🔗</div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">No Template associations discovered.</p>
                                    </div>
                                ) : (
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50/50">
                                            <tr>
                                                <th className="px-8 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Code</th>
                                                <th className="px-8 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Aesthetic Name</th>
                                                <th className="px-8 py-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                                                <th className="px-8 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Operations</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {links.map((link) => (
                                                <tr key={link.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-5 whitespace-nowrap font-mono text-[10px] font-black text-slate-500 uppercase tracking-widest">{link.templateCode}</td>
                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                        <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{link.templateName}</div>
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-center">
                                                        {link.isDefault ? (
                                                            <span className="bg-emerald-900 text-white px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-md">★ PRIMARY</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleSetDefault(link.id)}
                                                                className="text-slate-300 hover:text-emerald-600 transition-colors text-[9px] font-black uppercase tracking-widest"
                                                            >
                                                                Set Primary
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-right space-x-4">
                                                        <Link
                                                            href={`/templates/${link.templateId}/preview?versionId=${templates.find(t => t.id === link.templateId)?.currentActiveVersionId}&productId=${id}`}
                                                            className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest decoration-blue-200 underline underline-offset-4"
                                                        >
                                                            Initiate Handoff
                                                        </Link>
                                                        <RoleGuard allowedRoles={["Admin"]}>
                                                            <button
                                                                onClick={() => handleUnlink(link.id)}
                                                                className="text-red-300 hover:text-red-600 transition-colors text-[10px] font-black"
                                                            >
                                                                ✕
                                                            </button>
                                                        </RoleGuard>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Meta Intelligence */}
                    <div className="space-y-8">
                        <section className="bg-emerald-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
                             <div className="absolute right-[-20px] bottom-[-20px] font-black text-6xl text-white/5 italic">INFO</div>
                             <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                                 Operational Tip
                             </h4>
                             <p className="text-xs font-medium text-emerald-100/70 leading-relaxed italic">
                                associations enable the mapping of industrial variables.
                                Primary templates are automatically focused for high-velocity batch processing.
                             </p>
                        </section>

                        <section className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Audit History Summary</h4>
                             <div className="space-y-4">
                                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
                                     <span className="text-slate-400">Registry Input</span>
                                     <span className="text-slate-900">{new Date(product.createdAt).toLocaleDateString()}</span>
                                 </div>
                                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
                                     <span className="text-slate-400">Last System Sync</span>
                                     <span className="text-slate-900">VERIFIED</span>
                                 </div>
                             </div>
                        </section>
                    </div>
                </div>

                {/* Linkage Modal */}
                {showLinkModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2rem] p-10 max-w-md w-full shadow-2xl space-y-8 border border-slate-100">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">New Association</h3>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Bind template to current master record</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Target Template</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                                        value={selectedTemplateId}
                                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                                    >
                                        <option value="">-- SYSTEM DISCOVERY --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.code} // {t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <label className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                        checked={isDefault}
                                        onChange={(e) => setIsDefault(e.target.checked)}
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Mark as Primary</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Automatic focus for batch events</span>
                                    </div>
                                </label>

                                <div className="flex justify-end space-x-4 pt-4">
                                    <button
                                        onClick={() => setShowLinkModal(false)}
                                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 py-2 hover:text-slate-900 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleLink}
                                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
                                    >
                                        Seal Association
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


