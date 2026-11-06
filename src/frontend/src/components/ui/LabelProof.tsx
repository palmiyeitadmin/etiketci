"use client";

import type { ReactNode } from "react";

/**
 * The signature detail of the interface: a label shown on its liner with thin crop marks at the corners
 * and its size in millimetres. Use it wherever a label itself is shown (login, previews), and nowhere else.
 */
export function LabelProof({
    widthMm,
    heightMm,
    caption,
    children,
    className = "",
}: {
    widthMm: number;
    heightMm: number;
    caption?: string;
    children: ReactNode;
    className?: string;
}) {
    const marks = [
        "-left-5 -top-5 border-b border-r",
        "-right-5 -top-5 border-b border-l",
        "-bottom-5 -left-5 border-r border-t",
        "-bottom-5 -right-5 border-l border-t",
    ];

    return (
        <figure className={`flex flex-col items-center gap-4 ${className}`}>
            <div className="relative w-full" style={{ aspectRatio: `${widthMm} / ${heightMm}` }}>
                {marks.map((position) => (
                    <span key={position} aria-hidden className={`absolute h-3.5 w-3.5 border-ink-3/60 ${position}`} />
                ))}
                <div className="absolute inset-0 overflow-hidden rounded-[3%] bg-white shadow-pop">{children}</div>
            </div>
            <figcaption className="tabular flex flex-wrap justify-center gap-x-4 gap-y-1 whitespace-nowrap font-mono text-xs text-ink-3">
                <span>{widthMm} × {heightMm} mm</span>
                {caption ? <span>{caption}</span> : null}
            </figcaption>
        </figure>
    );
}
