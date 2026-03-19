"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Renders children into document.body via a React portal.
 * Use this to escape any parent transform/filter context that would
 * break `position: fixed` elements (e.g. modals, drawers, overlays).
 */
export function Portal({ children }: { children: ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}
