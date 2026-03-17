export interface RoleAssignment {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isImmutable: boolean;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  invitedAt?: string;
  invitedBy?: string;
  lastLoginAt?: string;
  roles: RoleAssignment[];
  permissions: string[];
}

export interface RoleSummary {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isImmutable: boolean;
  assignedUserCount: number;
  permissionKeys: string[];
}

export interface PermissionCatalogItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionCatalogGroup {
  key: string;
  label: string;
  items: PermissionCatalogItem[];
}
