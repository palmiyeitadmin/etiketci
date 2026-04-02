"use client";

import { useState, useCallback } from "react";
import {
    Columns,
    Rows,
    AlignLeft,
    ArrowsVertical,
    AlignRight,
    ArrowsOutLineHorizontal,
    ArrowsOutCardinal,
    ArrowsOutSimple,
} from "@phosphor-icons/react";
import type {
    LayoutDirection,
    LayoutJustifyContent,
    LayoutAlignItems,
} from "@/types/canvas";

interface LayoutPanelProps {
    direction: LayoutDirection;
    justifyContent: LayoutJustifyContent;
    alignItems: LayoutAlignItems;
    gap: number;
    wrap: "nowrap" | "wrap";
    onDirectionChange: (direction: LayoutDirection) => void;
    onJustifyContentChange: (justifyContent: LayoutJustifyContent) => void;
    onAlignItemsChange: (alignItems: LayoutAlignItems) => void;
    onGapChange: (gap: number) => void;
    onWrapChange: (wrap: "nowrap" | "wrap") => void;
}

/**
 * Layout Direction Options
 */
const DIRECTION_OPTIONS: { value: LayoutDirection; label: string; icon: any }[] = [
    { value: "row", label: "Row (Horizontal)", icon: Columns },
    { value: "column", label: "Column (Vertical)", icon: Rows },
];

/**
 * Justify Content Options
 */
const JUSTIFY_OPTIONS: { value: LayoutJustifyContent; label: string; icon: any }[] = [
    { value: "flex-start", label: "Start", icon: AlignLeft },
    { value: "center", label: "Center", icon: ArrowsVertical },
    { value: "flex-end", label: "End", icon: AlignRight },
    { value: "space-between", label: "Space Between", icon: ArrowsOutLineHorizontal },
    { value: "space-around", label: "Space Around", icon: ArrowsOutCardinal },
    { value: "space-evenly", label: "Space Evenly", icon: ArrowsOutLineHorizontal },
];

/**
 * Align Items Options
 */
const ALIGN_OPTIONS: { value: LayoutAlignItems; label: string; icon: any }[] = [
    { value: "flex-start", label: "Start", icon: AlignLeft },
    { value: "center", label: "Center", icon: ArrowsVertical },
    { value: "flex-end", label: "End", icon: AlignRight },
    { value: "stretch", label: "Stretch", icon: ArrowsOutSimple },
];

/**
 * Direction Button Component
 */
function DirectionButton({
    value,
    current,
    onChange,
    icon: Icon,
    label,
}: {
    value: LayoutDirection;
    current: LayoutDirection;
    onChange: (value: LayoutDirection) => void;
    icon: any;
    label: string;
}) {
    const isActive = value === current;

    return (
        <button
            onClick={() => onChange(value)}
            className={`
                flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all
                ${isActive
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-white/10 text-white/70 hover:bg-white/20"}
            `}
            title={label}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
        >
            <Icon size={18} weight={isActive ? "fill" : "regular"} />
            <span className="hidden md:inline">{label}</span>
        </button>
    );
}

/**
 * Grid Button Component
 */
function GridButton({
    value,
    current,
    onChange,
    icon: Icon,
    label,
}: {
    value: LayoutJustifyContent;
    current: LayoutJustifyContent;
    onChange: (value: LayoutJustifyContent) => void;
    icon: any;
    label: string;
}) {
    const isActive = value === current;

    return (
        <button
            onClick={() => onChange(value)}
            className={`
                flex flex-col items-center gap-1 rounded-lg p-2 transition-all
                ${isActive
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-white/10 text-white/70 hover:bg-white/20"}
            `}
            title={label}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
        >
            <Icon size={16} weight={isActive ? "fill" : "regular"} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        </button>
    );
}

/**
 * Align Button Component
 */
function AlignButton({
    value,
    current,
    onChange,
    icon: Icon,
    label,
}: {
    value: LayoutAlignItems;
    current: LayoutAlignItems;
    onChange: (value: LayoutAlignItems) => void;
    icon: any;
    label: string;
}) {
    const isActive = value === current;

    return (
        <button
            onClick={() => onChange(value as any)}
            className={`
                flex flex-col items-center gap-1 rounded-lg p-2 transition-all
                ${isActive
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-white/10 text-white/70 hover:bg-white/20"}
            `}
            title={label}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
        >
            <Icon size={16} weight={isActive ? "fill" : "regular"} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        </button>
    );
}

/**
 * Layout Panel Component
 */
export function EditorLayoutPanel({
    direction,
    justifyContent,
    alignItems,
    gap,
    wrap,
    onDirectionChange,
    onJustifyContentChange,
    onAlignItemsChange,
    onGapChange,
    onWrapChange,
}: LayoutPanelProps) {
    const [localGap, setLocalGap] = useState(gap);

    const handleGapChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newGap = parseFloat(e.target.value);
        setLocalGap(newGap);
        onGapChange(newGap);
    }, [onGapChange]);

    const handleGapBlur = useCallback(() => {
        setLocalGap(gap);
    }, [gap]);

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-white/50">
                    Direction
                </h3>
                <div className="flex gap-2">
                    {DIRECTION_OPTIONS.map((option) => (
                        <DirectionButton
                            key={option.value}
                            value={option.value}
                            current={direction}
                            onChange={onDirectionChange}
                            icon={option.icon}
                            label={option.label}
                        />
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-white/50">
                    Justify Content (Main Axis)
                </h3>
                <div className="grid grid-cols-3 gap-2">
                    {JUSTIFY_OPTIONS.map((option) => (
                        <GridButton
                            key={option.value}
                            value={option.value}
                            current={justifyContent}
                            onChange={onJustifyContentChange}
                            icon={option.icon}
                            label={option.label}
                        />
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-white/50">
                    Align Items (Cross Axis)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {ALIGN_OPTIONS.map((option) => (
                        <AlignButton
                            key={option.value}
                            value={option.value}
                            current={alignItems}
                            onChange={onAlignItemsChange}
                            icon={option.icon}
                            label={option.label}
                        />
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white/50">
                        Gap
                    </h3>
                    <span className="text-sm font-medium text-white">
                        {localGap.toFixed(1)} mm
                    </span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={20}
                    step={0.5}
                    value={localGap}
                    onChange={handleGapChange}
                    onBlur={handleGapBlur}
                    className="w-full cursor-pointer accent-blue-500"
                    aria-label="Gap size"
                    aria-valuemin={0}
                    aria-valuemax={20}
                    aria-valuenow={localGap}
                    aria-valuetext={`${localGap.toFixed(1)} mm`}
                />
                <div className="mt-2 flex justify-between text-[10px] text-white/40">
                    <span>0 mm</span>
                    <span>10 mm</span>
                    <span>20 mm</span>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-white/50">
                    Wrap
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => onWrapChange("nowrap")}
                        className={`
                            flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all
                            ${wrap === "nowrap"
                                ? "bg-blue-500 text-white shadow-lg"
                                : "bg-white/10 text-white/70 hover:bg-white/20"}
                        `}
                        type="button"
                        aria-pressed={wrap === "nowrap"}
                    >
                        No Wrap
                    </button>
                    <button
                        onClick={() => onWrapChange("wrap")}
                        className={`
                            flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all
                            ${wrap === "wrap"
                                ? "bg-blue-500 text-white shadow-lg"
                                : "bg-white/10 text-white/70 hover:bg-white/20"}
                        `}
                        type="button"
                        aria-pressed={wrap === "wrap"}
                    >
                        Wrap
                    </button>
                </div>
            </div>
        </div>
    );
}
