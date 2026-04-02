"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { X } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";

export function EditorHelpModal() {
    const { locale } = useI18n();
    const isHelpOpen = useEditorStore((state) => state.ui.isHelpOpen);
    const setHelpOpen = useEditorStore((state) => state.setHelpOpen);

    const modalRef = useFocusTrap(isHelpOpen, {
        onDeactivate: () => setHelpOpen(false),
    }) as React.RefObject<HTMLDivElement>;

    useEffect(() => {
        if (isHelpOpen) {
            document.body.style.overflow = 'hidden';
            modalRef.current?.focus();
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isHelpOpen]);

    if (!isHelpOpen) return null;

    const shortcuts = [
        { 
            category: locale === "tr" ? "Düzenleme" : "Edit",
            shortcuts: [
                { keys: "Ctrl+C", desc: locale === "tr" ? "Kopyala" : "Copy" },
                { keys: "Ctrl+V", desc: locale === "tr" ? "Yapıştır" : "Paste" },
                { keys: "Ctrl+S", desc: locale === "tr" ? "Kaydet" : "Save" },
                { keys: "Ctrl+Z / Ctrl+Shift+Z", desc: locale === "tr" ? "Geri / İleri al" : "Undo / Redo" },
                { keys: "Ctrl+D", desc: locale === "tr" ? "Çoğalt" : "Duplicate" },
                { keys: "Delete", desc: locale === "tr" ? "Sil" : "Delete" },
            ]
        },
        { 
            category: locale === "tr" ? "Düzenleme" : "Arrange",
            shortcuts: [
                { keys: "Ctrl+G / Ctrl+Shift+G", desc: locale === "tr" ? "Grupla / Grubu çöz" : "Group / Ungroup" },
                { keys: "R / Shift+R", desc: locale === "tr" ? "Saat yönüne/tersine döndür" : "Rotate clockwise / CCW" },
                { keys: "[ / ]", desc: locale === "tr" ? "Katman ileri / geri" : "Layer forward / backward" },
                { keys: "Shift+[ / Shift+]", desc: locale === "tr" ? "En arkaya / En öne" : "Send to back / Bring to front" },
            ]
        },
        { 
            category: locale === "tr" ? "Hareket" : "Move",
            shortcuts: [
                { keys: "Ok Tuşları", desc: locale === "tr" ? "0.5mm Hareket" : "0.5mm Nudge" },
                { keys: "Shift+Ok Tuşları", desc: locale === "tr" ? "2.0mm Hareket" : "2mm Nudge" },
                { keys: "Space + Sürükle", desc: locale === "tr" ? "Pan Modu" : "Pan Mode (Drag Canvas)" },
            ]
        },
        { 
            category: locale === "tr" ? "Görünüm" : "View",
            shortcuts: [
                { keys: "Mouse Tekerleği", desc: locale === "tr" ? "Zoom" : "Zoom" },
                { keys: "Escape", desc: locale === "tr" ? "Seçimi Kaldır / İptal" : "Clear selection / Cancel edit" },
            ]
        },
    ];

    return (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHelpOpen(false)} aria-hidden="true" />
            <div 
                ref={modalRef}
                className="relative flex max-h-full w-full max-w-2xl flex-col rounded-2xl bg-[#162032] shadow-2xl outline-none"
                role="document"
                tabIndex={-1}
            >
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <h2 
                        id="help-title"
                        className="text-lg font-bold text-white tracking-wide"
                    >
                        {locale === "tr" ? "Klavye Kısayolları" : "Keyboard Shortcuts"}
                    </h2>
                    <button 
                        onClick={() => setHelpOpen(false)} 
                        className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                        aria-label={locale === "tr" ? "Kapat" : "Close"}
                    >
                        <X weight="bold" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {shortcuts.map((category, i) => (
                        <div key={`${category.category}-${i}`} className="mb-6">
                            <h3 className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-blue-400">
                                {category.category}
                            </h3>
                            <table className="w-full text-sm" role="table">
                                <tbody>
                                    {category.shortcuts.map((shortcut, j) => (
                                        <tr key={`${category.category}-${i}-${j}`} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                            <td className="w-1/2 py-3 px-2">
                                                <div className="flex gap-2 font-mono text-blue-300">
                                                    {shortcut.keys.split(" / ").map((part, k) => (
                                                        <kbd 
                                                            key={k}
                                                            className="rounded bg-black/40 px-2 py-1 font-semibold"
                                                        >
                                                            {part}
                                                        </kbd>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="w-1/2 py-3 px-2 text-white/80 font-medium">
                                                {shortcut.desc}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     ))}
                </div>
            </div>
        </div>
    );
}
