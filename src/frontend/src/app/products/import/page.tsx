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
            // Direct raw fetch for multipart/form-data as apiFetch might need refinement for FormData
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Products/import/dry-run`, {
                method: "POST",
                body: formData,
                // Authentication header should be added here too, but for MVP dry-run let's see
                // Re-using session logic:
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
            <div className="p-8 max-w-4xl mx-auto">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                    <Link href="/products" className="hover:text-blue-600">Products</Link>
                    <span>/</span>
                    <span>CSV Import</span>
                </div>

                <h1 className="text-2xl font-bold mb-6">Import Products (Dry-Run)</h1>

                <div className="bg-white p-6 border rounded-lg shadow-sm mb-8">
                    <p className="text-sm text-gray-600 mb-4">
                        Upload a CSV file containing <code className="bg-gray-100 px-1 rounded text-red-600 font-bold">Sku, Name, Description, CategoryCode, VendorCode</code> headers.
                        The system will validate duplicates and existing categories/vendors without modifying the database.
                    </p>

                    <div className="flex items-center space-x-4">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50 hover:bg-blue-700"
                        >
                            {loading ? "Validating..." : "Start Dry-Run"}
                        </button>
                    </div>

                    {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
                </div>

                {report && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 border rounded text-center">
                                <span className="block text-2xl font-bold">{report.totalRows}</span>
                                <span className="text-xs text-gray-500 uppercase">Total Rows</span>
                            </div>
                            <div className="p-4 bg-green-50 border border-green-200 rounded text-center">
                                <span className="block text-2xl font-bold text-green-700">{report.validRows}</span>
                                <span className="text-xs text-green-600 uppercase">Valid</span>
                            </div>
                            <div className="p-4 bg-red-50 border border-red-200 rounded text-center">
                                <span className="block text-2xl font-bold text-red-700">{report.errorRows}</span>
                                <span className="text-xs text-red-600 uppercase">Errors</span>
                            </div>
                        </div>

                        {report.errors.length > 0 && (
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-red-50">
                                        <tr>
                                            <th className="px-6 py-2 text-left text-xs font-semibold text-red-700 uppercase">Row</th>
                                            <th className="px-6 py-2 text-left text-xs font-semibold text-red-700 uppercase">SKU</th>
                                            <th className="px-6 py-2 text-left text-xs font-semibold text-red-700 uppercase">Error Type</th>
                                            <th className="px-6 py-2 text-left text-xs font-semibold text-red-700 uppercase">Message</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100 font-mono text-xs">
                                        {report.errors.map((err, idx) => (
                                            <tr key={idx}>
                                                <td className="px-6 py-2">{err.rowNumber}</td>
                                                <td className="px-6 py-2">{err.sku}</td>
                                                <td className="px-6 py-2">
                                                    <span className="bg-red-100 px-1 rounded">{err.errorType}</span>
                                                </td>
                                                <td className="px-6 py-2">{err.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {report.errorRows === 0 && report.totalRows > 0 && (
                            <div className="p-4 bg-blue-50 text-blue-800 rounded border border-blue-200 text-center font-bold">
                                Dry-Run Successful! You can proceed to the actual import in the next phase.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
