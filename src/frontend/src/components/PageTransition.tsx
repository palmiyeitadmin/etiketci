"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

/**
 * Premium page transition wrapper.
 * Uses pathname as key to trigger enter/exit animations on route changes.
 * Provides a smooth fade + subtle slide up effect.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                transition={{
                    duration: 0.25,
                    ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="min-h-0 min-w-0 flex-1"
                style={{ willChange: "opacity, transform, filter" }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
