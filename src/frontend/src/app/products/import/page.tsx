"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { CsvImportReport } from "@/types/product";
import Link from "next/link";

export default function ProductImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [report, setReport] = useState<CsvImportReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setReport(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Products/import/dry-run`, {
                method: "POST",
                body: formData,
            });

            const json = await res.json();
            if (json.success) {
                setReport(json.data);
            } else {
                setError(json.error || "Failed to upload file.");
            }
        } catch (err) {
            setError("Network error communicating with API.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="p-8 max-w-6xl mx-auto">
                {/* Breadcrumbs */}
                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 border-b border-slate-100 pb-4">
                    <Link href="/products" className="hover:text-blue-600 transition-colors">Products</Link>
                    <span className="text-slate-200">/</span>
                    <span className="text-slate-900 uppercase">CSV Import Engine</span>
                </div>

                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Product Import</h1>
                        <p className="text-slate-500 max-w-xl font-medium mt-1">Industrial data ingestion with pre-commit dry-run validation.</p>
                    </div>
                    {report && (
                        <div className="flex space-x-2">
                             <button
                                onClick={() => { setReport(null); setFile(null); }}
                                className="bg-slate-100 text-slate-600 px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Clear Results
                            </button>
                        </div>
                    )}
                </div>

                {/* Upload Section */}
                {!report && (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center shadow-inner group hover:border-blue-400 transition-all">
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-50 transition-colors">
                                <span className="text-3xl">📄</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Select CSV Data File</h3>
                            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                                Ensure headers match exactly: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-bold font-mono">Sku, Name, CategoryCode, VendorCode</code>
                            </p>

                            <div className="space-y-4">
                                <input
                                    type="file"
                                    id="csv-upload"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                                <label
                                    htmlFor="csv-upload"
                                    className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-6 cursor-pointer hover:bg-white hover:shadow-md transition-all font-mono text-xs text-slate-600 truncate"
                                >
                                    {file ? file.name : "Click to select or drag file here"}
                                </label>
                                
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || loading}
                                    className="w-full bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center space-x-3"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Processing Engine...</span>
                                        </>
                                    ) : (
                                        <span>Initialize Dry-Run</span>
                                    )}
                                </button>
                            </div>
                            {error && <p className="mt-6 text-red-600 text-[10px] font-black uppercase tracking-widest bg-red-50 p-3 rounded-lg border border-red-100">ERR: {error}</p>}
                        </div>
                    </div>
                )}

                {/* Report Section */}
                {report && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 transition-all">
                        {/* Intelligence Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute right-[-10px] top-[-10px] opacity-10 font-black text-4xl text-white italic">TOTAL</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Ingested Rows</div>
                                <div className="text-4xl font-black text-white">{report.totalRows}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Validation Clean</div>
                                <div className="text-4xl font-black text-slate-800">{report.validRows}</div>
                                <div className="mt-2 h-1 bg-emerald-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(report.validRows / report.totalRows) * 100}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-4">Conflict/Error</div>
                                <div className="text-4xl font-black text-slate-800">{report.errorRows}</div>
                                <div className="mt-2 h-1 bg-red-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 transition-all" style={{ width: `${(report.errorRows / report.totalRows) * 100}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
                                {report.errorRows === 0 && report.totalRows > 0 ? (
                                    <>
                                        <span className="text-2xl mb-1">🏁</span>
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">READY FOR IMPORT</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl mb-1">🛑</span>
                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">COMMIT BLOCKED</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Error Breakdown */}
                        {report.errors.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Conflict Audit Log</h3>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Session ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50/50">
                                            <tr>
                                                <th className="px-8 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Pos</th>
                                                <th className="px-8 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Target SKU</th>
                                                <th className="px-8 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Context/Type</th>
                                                <th className="px-8 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Resolution Logic Error</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {report.errors.map((err, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-4 text-[11px] font-mono text-slate-400">#{err.rowNumber}</td>
                                                    <td className="px-8 py-4 text-[11px] font-black text-slate-800 uppercase tracking-tight">{err.sku || "N/A"}</td>
                                                    <td className="px-8 py-4">
                                                        <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest border ${
                                                            err.errorType === 'DuplicateInDb' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            err.errorType === 'InvalidReference' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            'bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}>
                                                            {err.errorType}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4 text-xs font-medium text-slate-600 italic">
                                                        "{err.message}"
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {report.errorRows === 0 && report.totalRows > 0 && (
                            <div className="p-10 bg-emerald-900 rounded-3xl text-center shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Zero Conflicts Detected</h3>
                                    <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-8">System is initialized for publication.</p>
                                    <button className="bg-white text-emerald-900 px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all shadow-xl">
                                        Execute Batch Import
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}

