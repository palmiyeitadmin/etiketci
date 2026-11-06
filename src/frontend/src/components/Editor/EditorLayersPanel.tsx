"use client";

import { useMemo, useState } from "react";
import { useOrderedLayers } from "@/components/Editor/editor-selectors";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { useI18n } from "@/lib/i18n";
import { LabelElement } from "@/types/canvas";

function makeGroupId() {
    return `grp-${Math.random().toString(36).slice(2, 8)}`;
}

export function EditorLayersPanel({ className = "" }: { className?: string }) {
    const { locale } = useI18n();
    const layers = useOrderedLayers();
    const selectedElementId = useEditorStore((state) => state.selection.selectedElementId);
    const setSelectedElementId = useEditorStore((state) => state.setSelectedElementId);
    const model = useEditorStore((state) => state.model);
    const updateElement = useEditorStore((state) => state.updateElement);
    const duplicateElement = useEditorStore((state) => state.duplicateElement);
    const removeElement = useEditorStore((state) => state.removeElement);
    const reorderElement = useEditorStore((state) => state.reorderElement);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const text = locale === "tr"
        ? {
            layers: "Katmanlar",
            description: "Üst katmanlar önce görüntülenir. Sıralama, PDF render sırasını yansıtır.",
            empty: "Henüz eleman yok.",
            hide: "Gizle",
            show: "Göster",
            lock: "Kilitle",
            unlock: "Kilidi Aç",
            forward: "İleri",
            back: "Geri",
            front: "Öne",
            toBack: "Arkaya",
            duplicate: "Çoğalt",
            delete: "Sil",
            newGroup: "Yeni Grup",
            ungroup: "Gruptan Çıkar",
            groupLabel: "Grup",
            ungrouped: "Gruplanmamış",
            renameGroup: "Grup adı",
        }
        : {
            layers: "Layers",
            description: "Top layers appear first. Order matches PDF render order.",
            empty: "No elements yet.",
            hide: "Hide",
            show: "Show",
            lock: "Lock",
            unlock: "Unlock",
            forward: "Forward",
            back: "Back",
            front: "Front",
            toBack: "To Back",
            duplicate: "Duplicate",
            delete: "Delete",
            newGroup: "New Group",
            ungroup: "Ungroup",
            groupLabel: "Group",
            ungrouped: "Ungrouped",
            renameGroup: "Group name",
        };

    const existingGroups = useMemo(() => {
        const map = new Map<string, string>();
        model.elements.forEach((element) => {
            if (element.groupId) {
                map.set(element.groupId, element.groupName || element.groupId);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [model.elements]);

    const groupedLayers = useMemo(() => {
        const groups: Array<{ key: string; name: string; items: LabelElement[]; groupId?: string }> = [];
        const byGroup = new Map<string, { key: string; name: string; items: LabelElement[]; groupId?: string }>();

        layers.forEach((layer) => {
            const key = layer.groupId || `ungrouped:${layer.id}`;
            const name = layer.groupId ? (layer.groupName || layer.groupId) : text.ungrouped;
            if (!byGroup.has(key)) {
                const group = { key, name, items: [], groupId: layer.groupId };
                byGroup.set(key, group);
                groups.push(group);
            }
            byGroup.get(key)!.items.push(layer);
        });

        return groups;
    }, [layers, text.ungrouped]);

    return (
        <aside className={`flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden overscroll-none border-l border-line bg-surface ${className}`}>
            <div className="shrink-0 border-b border-line px-5 py-4">
                <div className="text-xs font-medium text-ink-3">{text.layers}</div>
                <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 text-sm font-medium text-ink-2">{text.description}</div>
                    <div className="shrink-0 rounded-xl border border-line px-2 py-1 text-xs font-medium text-ink-3">{layers.length}</div>
                </div>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pr-2 pb-6" style={{ scrollbarGutter: "stable" }} onWheelCapture={(event) => event.stopPropagation()}>
                <div className="space-y-3">
                {layers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm font-medium text-ink-3">{text.empty}</div>
                ) : groupedLayers.map((group) => (
                    <div key={group.key} className="space-y-2">
                        {group.groupId ? (
                            <button
                                type="button"
                                className="flex w-full items-center justify-between rounded-lg border border-line bg-raised px-4 py-3 text-left"
                                onClick={() => setCollapsedGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                            >
                                <div>
                                    <div className="text-sm font-medium text-ink">{group.name}</div>
                                    <div className="mt-1 text-xs font-medium text-ink-3">{group.items.length} {text.layers.toLowerCase()}</div>
                                </div>
                                <div className="text-xs font-medium text-ink-3">{collapsedGroups[group.key] ? "+" : "-"}</div>
                            </button>
                        ) : null}
                        {!collapsedGroups[group.key] ? group.items.map((layer) => {
                            const isSelected = layer.id === selectedElementId;
                            return (
                                <div key={layer.id} className={`w-full min-w-0 rounded-lg border p-4 ${isSelected ? "border-accent/30 bg-accent/10" : "border-line bg-raised"}`}>
                                    <button type="button" onClick={() => setSelectedElementId(layer.id)} className="w-full text-left">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium text-ink">{layer.name || layer.type}</div>
                                                <div className="mt-1 truncate text-xs font-mono text-ink-3">{layer.type}</div>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                                <button type="button" className="rounded-xl border border-line px-2.5 py-1.5 text-xs font-medium" onClick={(event) => { event.stopPropagation(); updateElement(layer.id, { visible: !(layer.visible !== false) }); }}>
                                                    {layer.visible !== false ? text.hide : text.show}
                                                </button>
                                                <button type="button" className="rounded-xl border border-line px-2.5 py-1.5 text-xs font-medium" onClick={(event) => { event.stopPropagation(); updateElement(layer.id, { locked: !(layer.locked === true) }); }}>
                                                    {layer.locked ? text.unlock : text.lock}
                                                </button>
                                            </div>
                                        </div>
                                    </button>
                                    <div className="mt-3 min-w-0 space-y-3">
                                        <input className="plms-input py-2" value={layer.name || ""} onChange={(event) => updateElement(layer.id, { name: event.target.value }, { recordHistory: false })} />
                                        {isSelected ? (
                                            <>
                                                <div>
                                                    <label className="mb-2 block text-xs font-medium text-ink-3">{text.groupLabel}</label>
                                                    <select
                                                        className="plms-select w-full"
                                                        value={layer.groupId || ""}
                                                        onChange={(event) => {
                                                            const nextGroupId = event.target.value;
                                                            if (!nextGroupId) {
                                                                updateElement(layer.id, { groupId: undefined, groupName: undefined });
                                                                return;
                                                            }
                                                            const selectedGroup = existingGroups.find((item) => item.id === nextGroupId);
                                                            updateElement(layer.id, { groupId: nextGroupId, groupName: selectedGroup?.name || nextGroupId });
                                                        }}
                                                    >
                                                        <option value="">{text.ungrouped}</option>
                                                        {existingGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                                    </select>
                                                </div>
                                                {layer.groupId ? (
                                                    <input
                                                        className="plms-input py-2"
                                                        placeholder={text.renameGroup}
                                                        value={layer.groupName || ""}
                                                        onChange={(event) => {
                                                            const nextName = event.target.value;
                                                            model.elements
                                                                .filter((element) => element.groupId === layer.groupId)
                                                                .forEach((element) => updateElement(element.id, { groupName: nextName }, { recordHistory: false }));
                                                        }}
                                                    />
                                                ) : null}
                                            </>
                                        ) : null}
                                    </div>
                                    {isSelected ? (
                                        <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
                                            <button type="button" className="plms-button-compact" onClick={() => reorderElement(layer.id, "forward")}>{text.forward}</button>
                                            <button type="button" className="plms-button-compact" onClick={() => reorderElement(layer.id, "backward")}>{text.back}</button>
                                            <button type="button" className="plms-button-compact" onClick={() => reorderElement(layer.id, "front")}>{text.front}</button>
                                            <button type="button" className="plms-button-compact" onClick={() => reorderElement(layer.id, "back")}>{text.toBack}</button>
                                            <button type="button" className="plms-button-compact" onClick={() => duplicateElement(layer.id)}>{text.duplicate}</button>
                                            <button type="button" className="inline-flex min-w-0 items-center justify-center rounded-xl bg-bad px-3 py-2 text-xs font-medium text-white" onClick={() => removeElement(layer.id)}>{text.delete}</button>
                                            <button type="button" className="plms-button-compact col-span-2" onClick={() => updateElement(layer.id, { groupId: makeGroupId(), groupName: layer.groupName || layer.name || layer.type })}>{text.newGroup}</button>
                                            {layer.groupId ? <button type="button" className="plms-button-compact col-span-2" onClick={() => updateElement(layer.id, { groupId: undefined, groupName: undefined })}>{text.ungroup}</button> : null}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        }) : null}
                    </div>
                ))}
                </div>
            </div>
        </aside>
    );
}
