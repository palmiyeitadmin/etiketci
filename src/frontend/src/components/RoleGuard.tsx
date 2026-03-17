"use client";

import { useSession } from "next-auth/react";
import { hasLegacyRoleAccess } from "@/lib/permissions";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return null; // Or a skeleton loader
    }

    const userRoles = (session?.user as any)?.roles || [];
    const userPermissions = (session?.user as any)?.permissions || [];
    const isAuthorized = hasLegacyRoleAccess(userRoles, userPermissions, allowedRoles);

    if (!isAuthorized) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
