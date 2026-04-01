"use client";

import { useEditorStore } from "@/components/Editor/useEditorStore";
import { X } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";

export function EditorHelpModal() {
    const { locale } = useI18n();
    const isHelpOpen = useEditorStore((state) => state.ui.isHelpOpen);
    const setHelpOpen = useEditorStore((state) => state.setHelpOpen);

    if (!isHelpOpen) return null;

    const shortcuts = [
        { keys: "Ctrl+C", desc: locale === "tr" ? "Kopyala" : "Copy" },
        { keys: "Ctrl+V", desc: locale === "tr" ? "Yapıştır" : "Paste" },
        { keys: "Ctrl+S", desc: locale === "tr" ? "Kaydet" : "Save" },
        { keys: "Ctrl+Z / Ctrl+Shift+Z", desc: locale === "tr" ? "Geri / İleri al" : "Undo / Redo" },
        { keys: "Ctrl+D", desc: locale === "tr" ? "Çoğalt" : "Duplicate" },
        { keys: "Ctrl+G / Ctrl+Shift+G", desc: locale === "tr" ? "Grupla / Grubu çöz" : "Group / Ungroup" },
        { keys: "Delete", desc: locale === "tr" ? "Sil" : "Delete" },
        { keys: "R / Shift+R", desc: locale === "tr" ? "Saat yönüne/tersine döndür" : "Rotate clockwise / CCW" },
        { keys: "[ / ]", desc: locale === "tr" ? "Katman ileri / geri" : "Layer forward / backward" },
        { keys: "Shift+[ / Shift+]", desc: locale === "tr" ? "En arkaya / En öne" : "Send to back / Bring to front" },
        { keys: "Ok Tuşları", desc: locale === "tr" ? "0.5mm Hareket" : "0.5mm Nudge" },
        { keys: "Shift+Ok Tuşları", desc: locale === "tr" ? "2.0mm Hareket" : "2mm Nudge" },
        { keys: "Space + Sürükle", desc: locale === "tr" ? "Pan Modu" : "Pan Mode (Drag Canvas)" },
        { keys: "Mouse Tekerleği", desc: locale === "tr" ? "Zoom" : "Zoom" },
        { keys: "Escape", desc: locale === "tr" ? "Seçimi Kaldır / İptal" : "Clear selection / Cancel edit" },
    ];

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHelpOpen(false)} />
            <div className="relative flex max-h-full w-full max-w-2xl flex-col rounded-2xl bg-[#162032] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <h2 className="text-lg font-bold text-white tracking-wide">{locale === "tr" ? "Klavye Kısayolları" : "Keyboard Shortcuts"}</h2>
                    <button onClick={() => setHelpOpen(false)} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                        <X weight="bold" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <table className="w-full text-sm">
                        <tbody>
                            {shortcuts.map((shortcut, i) => (
                                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                    <td className="w-1/2 py-3 px-2">
                                        <div className="flex gap-2 font-mono text-blue-300">
                                            {shortcut.keys.split(" / ").map((part, j) => (
                                                <span key={j} className="rounded bg-black/40 px-2 py-1 font-semibold">{part}</span>
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
            </div>
        </div>
    );
}
