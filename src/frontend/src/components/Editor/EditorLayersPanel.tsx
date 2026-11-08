"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowLineDown, ArrowLineUp, ArrowUp, CaretDown, CaretRight, Copy, Eye, EyeSlash, FolderSimple, FolderSimpleMinus, FolderSimplePlus, LockSimple, LockSimpleOpen, Trash } from "@phosphor-icons/react";
import { EditorCommandButton } from "@/components/Editor/EditorIconButton";
import { getElementTypeMeta } from "@/components/Editor/EditorToolRail";
import { useOrderedLayers } from "@/components/Editor/editor-selectors";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { useI18n, useText } from "@/lib/i18n";
import { LabelElement } from "@/types/canvas";

function makeGroupId() {
    return `grp-${Math.random().toString(36).slice(2, 8)}`;
}

export function EditorLayersPanel({ className = "", showHeader = true }: { className?: string; showHeader?: boolean }) {
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

    const text = useText("editor").layers;

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

    const rowActions = (layer: LabelElement) => [
        { icon: ArrowUp, label: text.forward, shortcut: ["]"], onClick: () => reorderElement(layer.id, "forward") },
        { icon: ArrowDown, label: text.back, shortcut: ["["], onClick: () => reorderElement(layer.id, "backward") },
        { icon: ArrowLineUp, label: text.front, shortcut: ["Shift", "]"], onClick: () => reorderElement(layer.id, "front") },
        { icon: ArrowLineDown, label: text.toBack, shortcut: ["Shift", "["], onClick: () => reorderElement(layer.id, "back") },
        { icon: Copy, label: text.duplicate, shortcut: ["Ctrl", "D"], onClick: () => duplicateElement(layer.id) },
    ];

    return (
        <aside className={`flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden overscroll-none bg-surface ${className}`}>
            {showHeader ? (
                <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
                    <h2 className="text-base font-medium text-ink">{text.layers}</h2>
                    <span className="font-mono text-xs tabular text-ink-3">{layers.length}</span>
                </div>
            ) : null}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2" style={{ scrollbarGutter: "stable" }} onWheelCapture={(event) => event.stopPropagation()}>
                {layers.length > 0 ? <p className="px-2 pb-2 pt-1 text-xs text-ink-3">{text.description}</p> : null}
                {layers.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-ink-3">{text.empty}</div>
                ) : groupedLayers.map((group) => (
                    <div key={group.key}>
                        {group.groupId ? (
                            <button
                                type="button"
                                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-ink-2 transition-colors hover:bg-raised hover:text-ink"
                                aria-expanded={!collapsedGroups[group.key]}
                                onClick={() => setCollapsedGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                            >
                                {collapsedGroups[group.key] ? <CaretRight size={12} /> : <CaretDown size={12} />}
                                <FolderSimple size={16} />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">{group.name}</span>
                                <span className="font-mono text-xs tabular text-ink-3">{group.items.length}</span>
                            </button>
                        ) : null}
                        {!collapsedGroups[group.key] ? group.items.map((layer) => {
                            const isSelected = layer.id === selectedElementId;
                            const hidden = layer.visible === false;
                            const locked = layer.locked === true;
                            const meta = getElementTypeMeta(layer.type, locale);
                            const TypeIcon = meta.icon;
                            return (
                                <div key={layer.id} className={`group/row rounded-md ${isSelected ? "bg-accent-soft" : ""} ${group.groupId ? "ml-4" : ""}`}>
                                    <div className={`flex h-9 items-center gap-1 rounded-md pr-1 transition-colors ${isSelected ? "" : "hover:bg-raised"}`}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedElementId(layer.id)}
                                            aria-pressed={isSelected}
                                            title={meta.label}
                                            className={`flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left ${hidden ? "text-ink-3" : "text-ink"}`}
                                        >
                                            <TypeIcon size={16} className={isSelected ? "shrink-0 text-accent" : "shrink-0 text-ink-3"} />
                                            <span className="min-w-0 truncate text-sm">{layer.name || meta.label}</span>
                                        </button>
                                        <span className={`flex shrink-0 items-center ${hidden || locked || isSelected ? "" : "invisible group-hover/row:visible group-has-[:focus-visible]/row:visible"}`}>
                                            <button
                                                type="button"
                                                className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-surface hover:text-ink ${hidden ? "text-ink" : "text-ink-3"}`}
                                                aria-label={hidden ? text.show : text.hide}
                                                title={hidden ? text.show : text.hide}
                                                onClick={() => updateElement(layer.id, { visible: hidden })}
                                            >
                                                {hidden ? <EyeSlash size={16} /> : <Eye size={16} />}
                                            </button>
                                            <button
                                                type="button"
                                                className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-surface hover:text-ink ${locked ? "text-ink" : "text-ink-3"}`}
                                                aria-label={locked ? text.unlock : text.lock}
                                                title={locked ? text.unlock : text.lock}
                                                onClick={() => updateElement(layer.id, { locked: !locked })}
                                            >
                                                {locked ? <LockSimple size={16} /> : <LockSimpleOpen size={16} />}
                                            </button>
                                        </span>
                                    </div>
                                    {isSelected ? (
                                        <div className="space-y-3 px-2 pb-3 pt-1">
                                            <div>
                                                <label className="plms-label mb-1.5 block" htmlFor={`layer-name-${layer.id}`}>{text.name}</label>
                                                <input id={`layer-name-${layer.id}`} className="plms-input h-8" value={layer.name || ""} onChange={(event) => updateElement(layer.id, { name: event.target.value }, { recordHistory: false })} />
                                            </div>
                                            <div>
                                                <label className="plms-label mb-1.5 block" htmlFor={`layer-group-${layer.id}`}>{text.groupLabel}</label>
                                                <select
                                                    id={`layer-group-${layer.id}`}
                                                    className="plms-select h-8 w-full"
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
                                                    className="plms-input h-8"
                                                    aria-label={text.renameGroup}
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
                                            <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5">
                                                {rowActions(layer).map((action, index) => (
                                                    <EditorCommandButton key={action.label} icon={action.icon} label={action.label} shortcut={action.shortcut} onClick={action.onClick} side="top" align={index < 3 ? "start" : "end"} />
                                                ))}
                                                <span className="ml-auto">
                                                    <EditorCommandButton icon={Trash} label={text.delete} shortcut={["Del"]} tone="danger" onClick={() => removeElement(layer.id)} side="top" align="end" />
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="button" className="plms-button-compact flex-1" onClick={() => updateElement(layer.id, { groupId: makeGroupId(), groupName: layer.groupName || layer.name || layer.type })}>
                                                    <FolderSimplePlus size={16} />
                                                    {text.newGroup}
                                                </button>
                                                {layer.groupId ? (
                                                    <button type="button" className="plms-button-compact flex-1" onClick={() => updateElement(layer.id, { groupId: undefined, groupName: undefined })}>
                                                        <FolderSimpleMinus size={16} />
                                                        {text.ungroup}
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        }) : null}
                    </div>
                ))}
            </div>
        </aside>
    );
}
