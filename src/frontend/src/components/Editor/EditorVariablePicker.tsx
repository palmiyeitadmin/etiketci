"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ElementType, VariableCatalogItem } from "@/types/canvas";

export function EditorVariablePicker({
    supportedTypes,
    onInsert,
}: {
    supportedTypes: ElementType[];
    onInsert: (placeholder: string) => void;
}) {
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
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Variable Picker</div>
                <div className="mt-1 text-xs font-medium text-[color:var(--plms-text-muted)]">Insert supported placeholders into the current content field.</div>
            </div>
            <input className="plms-input" placeholder="Search variables" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="custom-scrollbar max-h-56 space-y-2 overflow-y-auto pr-1">
                {loading ? (
                    <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-6 text-center text-xs font-medium text-[color:var(--plms-text-subtle)]">Loading variables...</div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-6 text-center text-xs font-medium text-[color:var(--plms-text-subtle)]">No variables available for this element type.</div>
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
                        <div className="mt-1 text-[10px] font-medium text-[color:var(--plms-text-subtle)]">Sample: {item.sampleValue}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
