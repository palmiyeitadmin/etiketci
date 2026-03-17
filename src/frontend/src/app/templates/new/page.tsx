"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { CanonicalLabelModel } from "@/types/canvas";

type TemplateFormState = {
    name: string;
    code: string;
    description: string;
    widthMm: string;
    heightMm: string;
};

const initialFormState: TemplateFormState = {
    name: "",
    code: "",
    description: "",
    widthMm: "100",
    heightMm: "150",
};

function getErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== "object") return fallback;

    const errorRecord = error as Record<string, unknown>;
    if (typeof errorRecord.message === "string" && errorRecord.message.trim()) {
        return errorRecord.message;
    }

    return fallback;
}

function createInitialLayout(name: string, widthMm: number, heightMm: number): string {
    const model: CanonicalLabelModel = {
        version: "1.0",
        name,
        dimensions: { widthMm, heightMm },
        elements: [],
    };

    return JSON.stringify(model);
}

export default function NewTemplatePage() {
    const router = useRouter();
    const [form, setForm] = useState<TemplateFormState>(initialFormState);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (field: keyof TemplateFormState, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);

        const widthMm = Number.parseFloat(form.widthMm);
        const heightMm = Number.parseFloat(form.heightMm);

        if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) {
            setError("Label dimensions must be positive numbers.");
            setSaving(false);
            return;
        }

        const response = await apiFetch<{ id: string }>("/api/Templates", {
            method: "POST",
            body: JSON.stringify({
                name: form.name.trim(),
                code: form.code.trim(),
                description: form.description.trim(),
                initialLayoutJson: createInitialLayout(form.name.trim(), widthMm, heightMm),
            }),
        });

        if (response.success) {
            router.push(`/templates/${response.data.id}/edit`);
            return;
        }

        setError(getErrorMessage(response.error, "Template could not be created."));
        setSaving(false);
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="max-w-3xl mx-auto p-8 space-y-8">
                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <Link href="/templates" className="hover:text-blue-600 transition-colors">Templates</Link>
                    <span>/</span>
                    <span className="text-slate-900">New Template</span>
                </div>

                <div className="space-y-3">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Create Template</h1>
                    <p className="text-sm text-slate-500 max-w-2xl">Create the master template shell first. After creation, the editor opens on draft version `V1` for layout authoring.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-8 space-y-6">
                    {error && (
                        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Template Name</span>
                            <input
                                value={form.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                required
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                                placeholder="Front pallet label"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Template Code</span>
                            <input
                                value={form.code}
                                onChange={(e) => handleChange("code", e.target.value)}
                                required
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                                placeholder="TPL-PALLET-001"
                            />
                        </label>
                    </div>

                    <label className="space-y-2 block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</span>
                        <textarea
                            value={form.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            rows={4}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                            placeholder="Scope, substrate, and operational notes"
                        />
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Width (mm)</span>
                            <input
                                type="number"
                                min="1"
                                step="0.1"
                                value={form.widthMm}
                                onChange={(e) => handleChange("widthMm", e.target.value)}
                                required
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Height (mm)</span>
                            <input
                                type="number"
                                min="1"
                                step="0.1"
                                value={form.heightMm}
                                onChange={(e) => handleChange("heightMm", e.target.value)}
                                required
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                            />
                        </label>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-500">
                        A blank draft layout will be created with these physical dimensions. You can place text, shapes, QR, barcode, and image elements in the editor after this step.
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Link
                            href="/templates"
                            className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                        >
                            {saving ? "Creating..." : "Create Template"}
                        </button>
                    </div>
                </form>
            </div>
        </RoleGuard>
    );
}

