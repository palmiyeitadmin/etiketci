"use client";

import { useOrderedLayers } from "@/components/Editor/editor-selectors";
import { useEditorStore } from "@/components/Editor/useEditorStore";

export function EditorLayersPanel({ className = "" }: { className?: string }) {
    const layers = useOrderedLayers();
    const selectedElementId = useEditorStore((state) => state.selection.selectedElementId);
    const setSelectedElementId = useEditorStore((state) => state.setSelectedElementId);
    const updateElement = useEditorStore((state) => state.updateElement);
    const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
    const removeSelected = useEditorStore((state) => state.removeSelected);
    const reorderSelected = useEditorStore((state) => state.reorderSelected);

    return (
        <aside className={`flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden overscroll-none border-l border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] ${className}`}>
            <div className="shrink-0 border-b border-[color:var(--plms-border)] px-5 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Layers</div>
                <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 text-sm font-medium text-[color:var(--plms-text-muted)]">Top layers appear first. Order matches PDF render order.</div>
                    <div className="shrink-0 rounded-xl border border-[color:var(--plms-border)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{layers.length}</div>
                </div>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pr-2 pb-6" onWheelCapture={(event) => event.stopPropagation()}>
                <div className="space-y-3">
                {layers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-10 text-center text-sm font-medium text-[color:var(--plms-text-subtle)]">No elements yet.</div>
                ) : layers.map((layer) => {
                    const isSelected = layer.id === selectedElementId;
                    return (
                        <div key={layer.id} className={`w-full min-w-0 rounded-2xl border p-4 ${isSelected ? "border-blue-400/30 bg-blue-500/10" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)]"}`}>
                            <button type="button" onClick={() => setSelectedElementId(layer.id)} className="w-full text-left">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-black text-white">{layer.name || layer.type}</div>
                                        <div className="mt-1 truncate text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{layer.type}</div>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                        <button type="button" className="rounded-xl border border-[color:var(--plms-border)] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]" onClick={(event) => { event.stopPropagation(); updateElement(layer.id, { visible: !(layer.visible !== false) }); }}>
                                            {layer.visible !== false ? "Hide" : "Show"}
                                        </button>
                                        <button type="button" className="rounded-xl border border-[color:var(--plms-border)] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]" onClick={(event) => { event.stopPropagation(); updateElement(layer.id, { locked: !(layer.locked === true) }); }}>
                                            {layer.locked ? "Unlock" : "Lock"}
                                        </button>
                                    </div>
                                </div>
                            </button>
                            <div className="mt-3 min-w-0">
                                <input className="plms-input py-2" value={layer.name || ""} onChange={(event) => updateElement(layer.id, { name: event.target.value }, { recordHistory: false })} />
                            </div>
                            {isSelected ? (
                                <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
                                    <button type="button" className="plms-button-compact" onClick={() => reorderSelected("forward")}>Forward</button>
                                    <button type="button" className="plms-button-compact" onClick={() => reorderSelected("backward")}>Back</button>
                                    <button type="button" className="plms-button-compact" onClick={() => reorderSelected("front")}>Front</button>
                                    <button type="button" className="plms-button-compact" onClick={() => reorderSelected("back")}>To Back</button>
                                    <button type="button" className="plms-button-compact" onClick={duplicateSelected}>Duplicate</button>
                                    <button type="button" className="inline-flex min-w-0 items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white" onClick={removeSelected}>Delete</button>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
                </div>
            </div>
        </aside>
    );
}
