"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LockSimple } from "@phosphor-icons/react";
import { hasLegacyRoleAccess } from "@/lib/permissions";
import { useText } from "@/lib/i18n";

/**
 * Tells a guard whether it sits inside another guard. Only the outermost guard (the page) shows the
 * access message; nested guards around buttons or menu items still hide their content quietly.
 */
export const GuardDepthContext = createContext(false);

export function AccessDenied() {
    const text = useText("common").accessDenied;

    return (
        <div role="status" className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
            <span className="flex items-center gap-2 text-md font-medium text-ink">
                <LockSimple size={16} aria-hidden className="text-ink-3" />
                {text.title}
            </span>
            <p className="text-sm text-ink-2">{text.body}</p>
            <Link href="/" className="plms-button-secondary">{text.back}</Link>
        </div>
    );
}

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
    const { data: session, status } = useSession();
    const nested = useContext(GuardDepthContext);

    if (status === "loading") {
        return null;
    }

    const userRoles = (session?.user as any)?.roles || [];
    const userPermissions = (session?.user as any)?.permissions || [];
    const isAuthorized = hasLegacyRoleAccess(userRoles, userPermissions, allowedRoles);

    if (!isAuthorized) {
        if (fallback !== undefined) return <>{fallback}</>;
        return nested ? null : <AccessDenied />;
    }

    return <GuardDepthContext.Provider value={true}>{children}</GuardDepthContext.Provider>;
}
