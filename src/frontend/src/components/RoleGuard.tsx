"use client";

import { useSession } from "next-auth/react";

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

    // Verify if user has ANY of the allowed roles
    const isAuthorized = allowedRoles.some(role => userRoles.includes(role));

    if (!isAuthorized) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
