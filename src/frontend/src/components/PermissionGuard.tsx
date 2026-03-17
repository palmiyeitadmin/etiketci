"use client";

import { useSession } from "next-auth/react";
import { hasAnyPermission, PermissionKey } from "@/lib/permissions";

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: PermissionKey[];
  fallback?: React.ReactNode;
}

export function PermissionGuard({ children, permissions, fallback = null }: PermissionGuardProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  const userPermissions = (session?.user as any)?.permissions || [];
  const userRoles = (session?.user as any)?.roles || [];
  const isAuthorized = userRoles.includes("Admin") || hasAnyPermission(userPermissions, permissions);

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
