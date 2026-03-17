export type PermissionKey = string;

export const permissions = {
  dashboardView: "dashboard.view",
  auditView: "audit.view",
  usersView: "users.view",
  usersCreate: "users.create",
  usersEdit: "users.edit",
  usersActivate: "users.activate",
  usersResetPassword: "users.reset_password",
  usersAssignRoles: "users.assign_roles",
  rolesView: "roles.view",
  rolesCreate: "roles.create",
  rolesEdit: "roles.edit",
  rolesDelete: "roles.delete",
  rolesAssignPermissions: "roles.assign_permissions",
  productsView: "products.view",
  productsCreate: "products.create",
  productsEdit: "products.edit",
  productsDelete: "products.delete",
  productsImport: "products.import",
  vendorsView: "vendors.view",
  vendorsManage: "vendors.manage",
  categoriesView: "categories.view",
  categoriesManage: "categories.manage",
  templatesView: "templates.view",
  templatesCreate: "templates.create",
  templatesEdit: "templates.edit",
  templatesPreview: "templates.preview",
  templatesCompare: "templates.compare",
  templatesSubmitReview: "templates.submit_review",
  templatesReview: "templates.review",
  templatesPublish: "templates.publish",
  templatesArchive: "templates.archive",
  templatesRestore: "templates.restore",
  assetsView: "assets.view",
  assetsUpload: "assets.upload",
  assetsDelete: "assets.delete",
  printIntentsView: "printintents.view",
  printIntentsCreate: "printintents.create",
  printIntentsHandoff: "printintents.handoff",
  printIntentsDispatch: "printintents.dispatch",
  printIntentsConfirm: "printintents.confirm",
  printIntentsFail: "printintents.fail",
  printIntentsCancel: "printintents.cancel",
} as const;

const legacyRolePermissionMap: Record<string, PermissionKey[]> = {
  Admin: [],
  Operator: [
    permissions.productsCreate,
    permissions.productsEdit,
    permissions.productsImport,
    permissions.vendorsManage,
    permissions.categoriesManage,
    permissions.templatesCreate,
    permissions.templatesEdit,
    permissions.templatesSubmitReview,
    permissions.templatesRestore,
    permissions.assetsView,
    permissions.assetsUpload,
    permissions.printIntentsCreate,
    permissions.printIntentsHandoff,
    permissions.printIntentsDispatch,
    permissions.printIntentsConfirm,
    permissions.printIntentsFail,
    permissions.printIntentsCancel,
  ],
  Reviewer: [
    permissions.templatesReview,
    permissions.templatesPublish,
    permissions.templatesRestore,
  ],
  Viewer: [],
};

export function hasPermission(userPermissions: string[] | undefined, requiredPermission: PermissionKey): boolean {
  return (userPermissions || []).includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: string[] | undefined, requiredPermissions: PermissionKey[]): boolean {
  const granted = new Set(userPermissions || []);
  return requiredPermissions.some((permission) => granted.has(permission));
}

export function hasLegacyRoleAccess(userRoles: string[] | undefined, userPermissions: string[] | undefined, allowedRoles: string[]): boolean {
  const roles = userRoles || [];
  const permissionSet = new Set(userPermissions || []);

  return allowedRoles.some((allowedRole) => {
    if (allowedRole === "Viewer") {
      return true;
    }

    if (roles.includes(allowedRole)) {
      return true;
    }

    const mappedPermissions = legacyRolePermissionMap[allowedRole];
    if (!mappedPermissions) {
      return false;
    }

    if (allowedRole === "Admin") {
      return roles.includes("Admin");
    }

    return mappedPermissions.some((permission) => permissionSet.has(permission));
  });
}
