"use client";

import { useMemo, useState } from "react";
import { useOrderedLayers, useSelectedGroup } from "@/components/Editor/editor-selectors";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { useI18n } from "@/lib/i18n";
import { LabelElement } from "@/types/canvas";

interface LayerGroup {
    key: string;
    name: string;
    groupId?: string;
    items: LabelElement[];
}

export function EditorLayersPanel({ className = "" }: { className?: string }) {
    const { locale } = useI18n();
    const layers = useOrderedLayers();
    const selectedIds = useEditorStore((state) => state.selection.selectedElementIds);
    const activeEditingGroupId = useEditorStore((state) => state.selection.activeEditingGroupId);
    const selectOnly = useEditorStore((state) => state.selectOnly);
    const toggleSelectedElement = useEditorStore((state) => state.toggleSelectedElement);
    const updateElement = useEditorStore((state) => state.updateElement);
    const groupSelected = useEditorStore((state) => state.groupSelected);
    const ungroupSelectedGroup = useEditorStore((state) => state.ungroupSelectedGroup);
    const renameSelectedGroup = useEditorStore((state) => state.renameSelectedGroup);
    const setSelectedGroupVisibility = useEditorStore((state) => state.setSelectedGroupVisibility);
    const setSelectedGroupLocked = useEditorStore((state) => state.setSelectedGroupLocked);
    const setActiveEditingGroup = useEditorStore((state) => state.setActiveEditingGroup);
    const selectedGroup = useSelectedGroup();
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const text = locale === "tr"
        ? {
            layers: "Katmanlar",
            description: "Ust katmanlar once goruntulenir. Siralama, PDF render sirasini yansitir.",
            empty: "Henuz eleman yok.",
            hide: "Gizle",
            show: "Goster",
            lock: "Kilitle",
            unlock: "Kilidi Ac",
            group: "Grupla",
            ungroup: "Gruplamayi Kaldir",
            editGroup: "Grubu Duzenle",
            exitGroup: "Grup Modundan Cik",
            groupName: "Grup Adi",
            ungrouped: "Gruplanmamis",
        }
        : {
            layers: "Layers",
            description: "Top layers appear first. Order matches PDF render order.",
            empty: "No elements yet.",
            hide: "Hide",
            show: "Show",
            lock: "Lock",
            unlock: "Unlock",
            group: "Group",
            ungroup: "Ungroup",
            editGroup: "Edit Group",
            exitGroup: "Exit Group",
            groupName: "Group Name",
            ungrouped: "Ungrouped",
        };

    const layerGroups = useMemo<LayerGroup[]>(() => {
        const groups: LayerGroup[] = [];
        const map = new Map<string, LayerGroup>();

        layers.forEach((layer) => {
            const key = layer.groupId ? `group:${layer.groupId}` : `element:${layer.id}`;
            if (!map.has(key)) {
                const group = {
                    key,
                    name: layer.groupName || layer.groupId || layer.name || layer.type,
                    groupId: layer.groupId,
                    items: [],
                };
                map.set(key, group);
                groups.push(group);
            }

            map.get(key)!.items.push(layer);
        });

        return groups;
    }, [layers]);

    return (
        <aside className={`flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden overscroll-none border-l border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] ${className}`}>
            <div className="shrink-0 border-b border-[color:var(--plms-border)] px-5 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.layers}</div>
                <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 text-sm font-medium text-[color:var(--plms-text-muted)]">{text.description}</div>
                    <div className="shrink-0 rounded-xl border border-[color:var(--plms-border)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{layers.length}</div>
                </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pr-2 pb-6" style={{ scrollbarGutter: "stable" }} onWheelCapture={(event) => event.stopPropagation()}>
                <div className="space-y-3">
                    {layers.length === 0 ? <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-10 text-center text-sm font-medium text-[color:var(--plms-text-subtle)]">{text.empty}</div> : null}

                    {layerGroups.map((group) => {
                        const isCollapsed = collapsedGroups[group.key];
                        const isGroupSelected = Boolean(group.groupId && selectedGroup?.groupId === group.groupId);
                        const isEditingGroup = Boolean(group.groupId && activeEditingGroupId === group.groupId);

                        return (
                            <div key={group.key} className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)]">
                                {group.groupId ? (
                                    <div className={`border-b border-[color:var(--plms-border)] px-4 py-3 ${isGroupSelected ? "bg-blue-500/10" : ""}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => selectOnly(group.items.map((item) => item.id), { primaryId: group.items[0]?.id ?? null, activeEditingGroupId: null })}>
                                                <div className="truncate text-sm font-black text-white">{group.name}</div>
                                                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{group.items.length} items{isEditingGroup ? " • editing" : ""}</div>
                                            </button>
                                            <button type="button" className="text-xs font-black text-[color:var(--plms-text-subtle)]" onClick={() => setCollapsedGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}>{isCollapsed ? "+" : "-"}</button>
                                        </div>
                                        {isGroupSelected ? (
                                            <div className="mt-3 space-y-2">
                                                <input className="plms-input py-2" value={selectedGroup?.groupName || group.name} onChange={(event) => renameSelectedGroup(event.target.value)} placeholder={text.groupName} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button type="button" className="plms-button-compact" onClick={() => setSelectedGroupVisibility(false)}>{text.hide}</button>
                                                    <button type="button" className="plms-button-compact" onClick={() => setSelectedGroupVisibility(true)}>{text.show}</button>
                                                    <button type="button" className="plms-button-compact" onClick={() => setSelectedGroupLocked(true)}>{text.lock}</button>
                                                    <button type="button" className="plms-button-compact" onClick={() => setSelectedGroupLocked(false)}>{text.unlock}</button>
                                                    <button type="button" className="plms-button-compact" onClick={() => setActiveEditingGroup(isEditingGroup ? null : group.groupId || null)}>{isEditingGroup ? text.exitGroup : text.editGroup}</button>
                                                    <button type="button" className="plms-button-compact" onClick={ungroupSelectedGroup}>{text.ungroup}</button>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {!isCollapsed ? (
                                    <div className="space-y-2 p-3">
                                        {group.items.map((layer) => {
                                            const isSelected = selectedIds.includes(layer.id);
                                            return (
                                                <button
                                                    key={layer.id}
                                                    type="button"
                                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${isSelected ? "border-blue-400/30 bg-blue-500/10" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] hover:bg-white/5"}`}
                                                    onClick={(event) => {
                                                        if (event.shiftKey || event.ctrlKey || event.metaKey) {
                                                            toggleSelectedElement(layer.id, group.groupId && !activeEditingGroupId ? group.items.map((item) => item.id) : undefined);
                                                            return;
                                                        }

                                                        selectOnly(group.groupId && !activeEditingGroupId ? group.items.map((item) => item.id) : [layer.id], {
                                                            primaryId: layer.id,
                                                            activeEditingGroupId: activeEditingGroupId ?? null,
                                                        });
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-sm font-black text-white">{layer.name || layer.type}</div>
                                                            <div className="mt-1 truncate text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{layer.type}</div>
                                                        </div>
                                                        <div className="flex shrink-0 flex-wrap gap-2">
                                                            <button type="button" className="rounded-xl border border-[color:var(--plms-border)] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]" onClick={(event) => { event.stopPropagation(); updateElement(layer.id, { visible: !(layer.visible !== false) }); }}>{layer.visible !== false ? text.hide : text.show}</button>
                                                            <button type="button" className="rounded-xl border border-[color:var(--plms-border)] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]" onClick={(event) => { event.stopPropagation(); updateElement(layer.id, { locked: !(layer.locked === true) }); }}>{layer.locked ? text.unlock : text.lock}</button>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}

                    {selectedIds.length >= 2 && !selectedGroup ? (
                        <button type="button" className="plms-button-compact w-full" onClick={groupSelected}>{text.group}</button>
                    ) : null}
                </div>
            </div>
        </aside>
    );
}
