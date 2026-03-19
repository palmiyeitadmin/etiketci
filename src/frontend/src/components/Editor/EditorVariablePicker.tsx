"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ElementType, VariableCatalogItem } from "@/types/canvas";
import { useI18n } from "@/lib/i18n";

export function EditorVariablePicker({
    supportedTypes,
    onInsert,
}: {
    supportedTypes: ElementType[];
    onInsert: (placeholder: string) => void;
}) {
    const { locale } = useI18n();
    const text = locale === "tr"
        ? {
            title: "Degisken Secici",
            description: "Mevcut icerik alanina desteklenen yer tutucular ekleyin.",
            search: "Degiskenleri ara",
            loading: "Degiskenler yukleniyor...",
            empty: "Bu eleman tipi icin degisken bulunamadi.",
            sample: "Ornek",
        }
        : {
            title: "Variable Picker",
            description: "Insert supported placeholders into the current content field.",
            search: "Search variables",
            loading: "Loading variables...",
            empty: "No variables available for this element type.",
            sample: "Sample",
        };

    const [items, setItems] = useState<VariableCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");

    useEffect(() => {
        async function load() {
            const response = await apiFetch<{ items: VariableCatalogItem[] }>("/api/Templates/variables/catalog");
            if (response.success) {
                setItems(response.data.items);
            }
            setLoading(false);
        }

        load();
    }, []);

    const filtered = items.filter((item) =>
        item.supportedElementTypes.some((type) => supportedTypes.includes(type)) &&
        [item.key, item.label, item.description].join(" ").toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="space-y-3 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-4">
            <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.title}</div>
                <div className="mt-1 text-xs font-medium text-[color:var(--plms-text-muted)]">{text.description}</div>
            </div>
            <input className="plms-input" placeholder={text.search} value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="custom-scrollbar max-h-56 space-y-2 overflow-y-auto pr-1">
                {loading ? (
                    <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-6 text-center text-xs font-medium text-[color:var(--plms-text-subtle)]">{text.loading}</div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-6 text-center text-xs font-medium text-[color:var(--plms-text-subtle)]">{text.empty}</div>
                ) : filtered.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onInsert(`{{ ${item.key} }}`)}
                        className="w-full rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-3 text-left transition-colors hover:bg-white/5"
                    >
                        <div className="text-sm font-black text-white">{item.label}</div>
                        <div className="mt-1 font-mono text-[10px] text-blue-300">{`{{ ${item.key} }}`}</div>
                        <div className="mt-2 text-xs font-medium text-[color:var(--plms-text-muted)]">{item.description}</div>
                        <div className="mt-1 text-[10px] font-medium text-[color:var(--plms-text-subtle)]">{text.sample}: {item.sampleValue}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
