"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DotsThree } from "@phosphor-icons/react";
import { Portal } from "@/components/ui/Portal";

export type RowMenuItem = {
    label: string;
    onSelect?: () => void;
    href?: string;
    tone?: "danger";
    disabled?: boolean;
    title?: string;
    /** Draw a hairline above this item, to separate destructive actions. */
    separated?: boolean;
};

const MENU_WIDTH = 208;

/**
 * The "more" menu of a list row. It renders into a portal with fixed positioning, so table wrappers
 * with overflow clipping do not cut it off. Closes on outside click, Escape, scroll and resize.
 */
export function TemplateRowMenu({ items, label }: { items: RowMenuItem[]; label: string }) {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const open = position !== null;

    const close = useCallback(() => setPosition(null), []);

    const toggle = () => {
        if (open) {
            close();
            return;
        }
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const estimatedHeight = items.length * 36 + 8;
        const below = rect.bottom + 4;
        const top = below + estimatedHeight > window.innerHeight ? Math.max(8, rect.top - estimatedHeight - 4) : below;
        const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
        setPosition({ top, left });
    };

    useEffect(() => {
        if (!open) return;
        const onPointer = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            close();
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                close();
                triggerRef.current?.focus();
            }
        };
        window.addEventListener("mousedown", onPointer);
        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        return () => {
            window.removeEventListener("mousedown", onPointer);
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [open, close]);

    useEffect(() => {
        if (open) menuRef.current?.querySelector<HTMLElement>("[role=menuitem]:not([aria-disabled=true])")?.focus();
    }, [open]);

    if (items.length === 0) return null;

    const itemClass = (item: RowMenuItem) =>
        `flex h-9 w-full items-center rounded-md px-3 text-left text-sm transition-colors focus:outline-none ${
            item.disabled
                ? "cursor-not-allowed text-ink-3"
                : item.tone === "danger"
                    ? "text-bad hover:bg-bad-soft focus-visible:bg-bad-soft"
                    : "text-ink hover:bg-raised focus-visible:bg-raised"
        }`;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-raised hover:text-ink ${open ? "bg-raised text-ink" : ""}`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                title={label}
                onClick={(event) => {
                    event.stopPropagation();
                    toggle();
                }}
            >
                <DotsThree size={16} weight="bold" />
            </button>
            {position ? (
                <Portal>
                    <div
                        ref={menuRef}
                        role="menu"
                        aria-label={label}
                        className="fixed z-50 rounded-lg border border-line bg-surface p-1 shadow-pop"
                        style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {items.map((item) => (
                            <div key={item.label} className={item.separated ? "mt-1 border-t border-line pt-1" : undefined}>
                                {item.href && !item.disabled ? (
                                    <Link href={item.href} role="menuitem" className={itemClass(item)} title={item.title} onClick={close}>
                                        {item.label}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        aria-disabled={item.disabled || undefined}
                                        className={itemClass(item)}
                                        title={item.title}
                                        onClick={() => {
                                            if (item.disabled) return;
                                            close();
                                            item.onSelect?.();
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </Portal>
            ) : null}
        </>
    );
}
