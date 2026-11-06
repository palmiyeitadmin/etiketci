"use client";

import { usePathname } from "next/navigation";

/**
 * A short opacity fade when the route changes.
 * Opacity only: transform, filter or will-change would turn this wrapper into the containing block
 * for position: fixed children and break modals that do not use a portal.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div key={pathname} className="animate-plms-fade min-h-0 min-w-0 flex-1">
            {children}
        </div>
    );
}
