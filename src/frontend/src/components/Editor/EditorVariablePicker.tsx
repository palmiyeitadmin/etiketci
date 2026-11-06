"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ElementType, VariableCatalogItem } from "@/types/canvas";
import { useI18n } from "@/lib/i18n";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";

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
            title: "Değişken ekle",
            description: "Seçtiğiniz değişken içeriğin sonuna eklenir",
            search: "Değişken ara",
            loading: "Değişkenler yükleniyor",
            empty: "Bu öğe türü için değişken yok",
            sample: "Örnek",
        }
        : {
            title: "Insert variable",
            description: "The variable is added to the end of the content",
            search: "Search variables",
            loading: "Loading variables",
            empty: "No variables for this element type",
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
        <div className="space-y-2">
            <div>
                <div className="plms-label">{text.title}</div>
                <div className="text-xs text-ink-3">{text.description}</div>
            </div>
            <div className="relative">
                <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input className="plms-input h-8 pl-9" aria-label={text.search} placeholder={text.search} value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="custom-scrollbar max-h-56 overflow-y-auto rounded-lg border border-line">
                {loading ? (
                    <div className="px-3 py-6 text-center text-xs text-ink-3">{text.loading}</div>
                ) : filtered.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-ink-3">{text.empty}</div>
                ) : (
                    <div className="divide-y divide-line">
                        {filtered.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => onInsert(`{{ ${item.key} }}`)}
                                className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-raised"
                            >
                                <Plus size={16} className="mt-0.5 shrink-0 text-ink-3" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm text-ink">{item.label}</span>
                                    <span className="block truncate font-mono text-xs text-ink-2">{`{{ ${item.key} }}`}</span>
                                    {item.description ? <span className="mt-0.5 block text-xs text-ink-3">{item.description}</span> : null}
                                    {item.sampleValue ? <span className="block truncate text-xs text-ink-3">{text.sample}: <span className="font-mono">{item.sampleValue}</span></span> : null}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
