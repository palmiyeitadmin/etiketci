"use client";

import { useMemo, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { DotsSixVertical, Eye, EyeSlash, Lock, LockSimpleOpen, CaretDown, CaretRight, TreeStructure, Trash, SelectionPlus } from "@phosphor-icons/react";
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

function SortableLayerItem({ id, children, isOverlay = false }: { id: string; children: (props: { dragHandleProps: any; isDragging: boolean }) => React.ReactNode; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.3 : 1,
        position: "relative" as const,
        zIndex: isDragging ? 10 : 1,
    };
    
    return (
        <div ref={setNodeRef} style={style} className="group/sortable outline-none">
            {children({ dragHandleProps: { ...attributes, ...listeners }, isDragging: isDragging && !isOverlay })}
        </div>
    );
}

function LayerItemCard({ 
    group, 
    isCollapsed, 
    isGroupSelected, 
    isEditingGroup, 
    selectedIds, 
    text, 
    dragHandleProps,
    onToggleCollapse,
    onSelectGroup,
    onRenameGroup,
    onSetGroupVisibility,
    onSetGroupLocked,
    onToggleEditGroup,
    onUngroup,
    onToggleElement,
    onSelectElement,
    onUpdateElement,
    activeEditingGroupId
}: {
    group: LayerGroup;
    isCollapsed: boolean;
    isGroupSelected: boolean;
    isEditingGroup: boolean;
    selectedIds: string[];
    text: any;
    dragHandleProps?: any;
    onToggleCollapse: () => void;
    onSelectGroup: () => void;
    onRenameGroup: (name: string) => void;
    onSetGroupVisibility: (v: boolean) => void;
    onSetGroupLocked: (l: boolean) => void;
    onToggleEditGroup: () => void;
    onUngroup: () => void;
    onToggleElement: (id: string, groupIds?: string[]) => void;
    onSelectElement: (ids: string[], options: any) => void;
    onUpdateElement: (id: string, updates: any) => void;
    activeEditingGroupId: string | null;
}) {
    return (
        <div className={`rounded-2xl border transition-all ${isGroupSelected ? "border-blue-400/50 bg-[color:var(--plms-panel-2)] shadow-lg shadow-blue-500/5" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)]"}`}>
            {group.groupId ? (
                <div className={`flex flex-col border-b border-[color:var(--plms-border)] px-4 py-3 ${isGroupSelected ? "bg-blue-500/5" : ""}`}>
                    <div className="flex items-center gap-3">
                        {dragHandleProps && (
                            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-[color:var(--plms-text-muted)] hover:text-white transition-colors">
                                <DotsSixVertical size={18} weight="bold" />
                            </div>
                        )}
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={(e) => { e.stopPropagation(); onSelectGroup(); }}>
                            <div className="flex items-center gap-2">
                                <TreeStructure size={14} className="text-blue-400" weight="bold" />
                                <div className="truncate text-sm font-black text-white">{group.name}</div>
                            </div>
                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{group.items.length} {text.itemsCount}{isEditingGroup ? " • editing" : ""}</div>
                        </button>
                        <button type="button" className="rounded-lg p-1.5 text-[color:var(--plms-text-muted)] hover:bg-white/5 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}>
                            {isCollapsed ? <CaretRight size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                        </button>
                    </div>
                    {isGroupSelected ? (
                        <div className="mt-3 space-y-2">
                            <input className="plms-input py-2 text-xs" value={group.name} onChange={(event) => onRenameGroup(event.target.value)} placeholder={text.groupName} />
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" className="plms-button-compact flex items-center justify-center gap-2" onClick={() => onSetGroupVisibility(false)}><EyeSlash size={14}/> {text.hide}</button>
                                <button type="button" className="plms-button-compact flex items-center justify-center gap-2" onClick={() => onSetGroupVisibility(true)}><Eye size={14}/> {text.show}</button>
                                <button type="button" className="plms-button-compact flex items-center justify-center gap-2" onClick={() => onSetGroupLocked(true)}><Lock size={14}/> {text.lock}</button>
                                <button type="button" className="plms-button-compact flex items-center justify-center gap-2" onClick={() => onSetGroupLocked(false)}><LockSimpleOpen size={14}/> {text.unlock}</button>
                                <button type="button" className="plms-button-compact flex items-center justify-center gap-2 col-span-2" onClick={onToggleEditGroup}>{isEditingGroup ? text.exitGroup : text.editGroup}</button>
                                <button type="button" className="plms-button-compact flex items-center justify-center gap-2 col-span-2 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={onUngroup}>{text.ungroup}</button>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {!isCollapsed ? (
                <div className="space-y-1 p-2">
                    {group.items.map((layer) => {
                        const isSelected = selectedIds.includes(layer.id);
                        return (
                            <div key={layer.id} className="relative flex items-center group/item">
                                {!group.groupId && dragHandleProps && (
                                    <div {...dragHandleProps} className="absolute -left-1 z-10 cursor-grab active:cursor-grabbing text-[color:var(--plms-text-muted)] opacity-0 group-hover/item:opacity-100 transition-all hover:text-white bg-[color:var(--plms-panel-2)] rounded-full p-0.5">
                                        <DotsSixVertical size={16} weight="bold" />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${isSelected ? "border-blue-500/40 bg-blue-500/10 shadow-sm" : "border-transparent bg-transparent hover:bg-white/5"}`}
                                    onClick={(event) => {
                                        if (event.shiftKey || event.ctrlKey || event.metaKey) {
                                            onToggleElement(layer.id, group.groupId && !activeEditingGroupId ? group.items.map((item) => item.id) : undefined);
                                            return;
                                        }

                                        onSelectElement(group.groupId && !activeEditingGroupId ? group.items.map((item) => item.id) : [layer.id], {
                                            primaryId: layer.id,
                                            activeEditingGroupId: activeEditingGroupId ?? null,
                                        });
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-2 ml-1">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[13px] font-bold text-white">{layer.name || layer.type}</div>
                                            <div className="mt-0.5 truncate text-[9px] font-mono uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)] opacity-70">{layer.type}</div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            <button type="button" className={`p-1.5 rounded-lg transition-colors ${layer.visible !== false ? "text-[color:var(--plms-text-muted)] hover:text-white" : "text-blue-400 bg-blue-500/10"}`} onClick={(event) => { event.stopPropagation(); onUpdateElement(layer.id, { visible: !(layer.visible !== false) }); }}>
                                                {layer.visible !== false ? <Eye size={14} weight="bold" /> : <EyeSlash size={14} weight="bold" />}
                                            </button>
                                            <button type="button" className={`p-1.5 rounded-lg transition-colors ${layer.locked ? "text-orange-400 bg-orange-500/10" : "text-[color:var(--plms-text-muted)] hover:text-white"}`} onClick={(event) => { event.stopPropagation(); onUpdateElement(layer.id, { locked: !(layer.locked === true) }); }}>
                                                {layer.locked ? <Lock size={14} weight="bold" /> : <LockSimpleOpen size={14} weight="bold" />}
                                            </button>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
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
    const model = useEditorStore((state) => state.model);
    const applyModel = useEditorStore((state) => state.applyModel);
    const selectedGroup = useSelectedGroup();
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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
            itemsCount: "eleman",
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
            itemsCount: "items",
        };

    const [activeId, setActiveId] = useState<string | null>(null);

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

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
        useEditorStore.getState().captureHistory();
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        
        if (over && active.id !== over.id) {
            const oldIndex = layerGroups.findIndex((g) => g.key === active.id);
            const newIndex = layerGroups.findIndex((g) => g.key === over.id);
            
            const newGroups = arrayMove(layerGroups, oldIndex, newIndex);
            
            const newElementsOrder = newGroups.reduce((acc, group) => {
                return acc.concat(group.items);
            }, [] as LabelElement[]);
            
            // Reversed elements to match the bottom-up z-index order
            const finalElements = newElementsOrder.reverse();
            
            applyModel({ ...model, elements: finalElements });
        }
    };

    const activeGroup = activeId ? layerGroups.find(g => g.key === activeId) : null;

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

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <SortableContext items={layerGroups.map(g => g.key)} strategy={verticalListSortingStrategy}>
                            {layerGroups.map((group) => {
                                const isCollapsed = collapsedGroups[group.key];
                                const isGroupSelected = Boolean(group.groupId && selectedGroup?.groupId === group.groupId);
                                const isEditingGroup = Boolean(group.groupId && activeEditingGroupId === group.groupId);

                                return (
                                    <SortableLayerItem key={group.key} id={group.key}>
                                        {({ dragHandleProps, isDragging }) => (
                                            <LayerItemCard 
                                                group={group}
                                                isCollapsed={isCollapsed}
                                                isGroupSelected={isGroupSelected}
                                                isEditingGroup={isEditingGroup}
                                                selectedIds={selectedIds}
                                                text={text}
                                                dragHandleProps={dragHandleProps}
                                                activeEditingGroupId={activeEditingGroupId ?? null}
                                                onToggleCollapse={() => setCollapsedGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                                                onSelectGroup={() => selectOnly(group.items.map((item) => item.id), { primaryId: group.items[0]?.id ?? null, activeEditingGroupId: null })}
                                                onRenameGroup={renameSelectedGroup}
                                                onSetGroupVisibility={setSelectedGroupVisibility}
                                                onSetGroupLocked={setSelectedGroupLocked}
                                                onToggleEditGroup={() => setActiveEditingGroup(isEditingGroup ? null : group.groupId || null)}
                                                onUngroup={ungroupSelectedGroup}
                                                onToggleElement={toggleSelectedElement}
                                                onSelectElement={selectOnly}
                                                onUpdateElement={updateElement}
                                            />
                                        )}
                                    </SortableLayerItem>
                                );
                            })}
                        </SortableContext>
                        
                        <DragOverlay adjustScale={false} dropAnimation={{
                            sideEffects: defaultDropAnimationSideEffects({
                                styles: {
                                    active: {
                                        opacity: '0.3',
                                    },
                                },
                            }),
                        }}>
                            {activeId && activeGroup ? (
                                <div className="z-[9999] opacity-90 shadow-2xl scale-[1.02] transition-transform">
                                    <LayerItemCard 
                                        group={activeGroup}
                                        isCollapsed={collapsedGroups[activeId]}
                                        isGroupSelected={Boolean(activeGroup.groupId && selectedGroup?.groupId === activeGroup.groupId)}
                                        isEditingGroup={Boolean(activeGroup.groupId && activeEditingGroupId === activeGroup.groupId)}
                                        selectedIds={selectedIds}
                                        text={text}
                                        activeEditingGroupId={activeEditingGroupId ?? null}
                                        onToggleCollapse={() => {}}
                                        onSelectGroup={() => {}}
                                        onRenameGroup={() => {}}
                                        onSetGroupVisibility={() => {}}
                                        onSetGroupLocked={() => {}}
                                        onToggleEditGroup={() => {}}
                                        onUngroup={() => {}}
                                        onToggleElement={() => {}}
                                        onSelectElement={() => {}}
                                        onUpdateElement={() => {}}
                                    />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    {selectedIds.length >= 2 && !selectedGroup ? (
                        <button type="button" className="plms-button-compact w-full" onClick={groupSelected}>{text.group}</button>
                    ) : null}
                </div>
            </div>
        </aside>
    );
}
