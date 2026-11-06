"use client";

import { useContext } from "react";
import { useSession } from "next-auth/react";
import { hasAnyPermission, PermissionKey } from "@/lib/permissions";
import { AccessDenied, GuardDepthContext } from "@/components/RoleGuard";

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: PermissionKey[];
  fallback?: React.ReactNode;
}

export function PermissionGuard({ children, permissions, fallback }: PermissionGuardProps) {
  const { data: session, status } = useSession();
  const nested = useContext(GuardDepthContext);

  if (status === "loading") {
    return null;
  }

  const userPermissions = (session?.user as any)?.permissions || [];
  const userRoles = (session?.user as any)?.roles || [];
  const isAuthorized = userRoles.includes("Admin") || hasAnyPermission(userPermissions, permissions);

  if (!isAuthorized) {
    if (fallback !== undefined) return <>{fallback}</>;
    return nested ? null : <AccessDenied />;
  }

  return <GuardDepthContext.Provider value={true}>{children}</GuardDepthContext.Provider>;
}
