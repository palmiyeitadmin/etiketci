namespace Plms.Api.Security
{
    public static class Permissions
    {
        public const string DashboardView = "dashboard.view";
        public const string AuditView = "audit.view";

        public const string UsersView = "users.view";
        public const string UsersCreate = "users.create";
        public const string UsersEdit = "users.edit";
        public const string UsersActivate = "users.activate";
        public const string UsersResetPassword = "users.reset_password";
        public const string UsersAssignRoles = "users.assign_roles";

        public const string RolesView = "roles.view";
        public const string RolesCreate = "roles.create";
        public const string RolesEdit = "roles.edit";
        public const string RolesDelete = "roles.delete";
        public const string RolesAssignPermissions = "roles.assign_permissions";

        public const string ProductsView = "products.view";
        public const string ProductsCreate = "products.create";
        public const string ProductsEdit = "products.edit";
        public const string ProductsDelete = "products.delete";
        public const string ProductsImport = "products.import";

        public const string VendorsView = "vendors.view";
        public const string VendorsManage = "vendors.manage";

        public const string CategoriesView = "categories.view";
        public const string CategoriesManage = "categories.manage";

        public const string TemplatesView = "templates.view";
        public const string TemplatesCreate = "templates.create";
        public const string TemplatesEdit = "templates.edit";
        public const string TemplatesPreview = "templates.preview";
        public const string TemplatesCompare = "templates.compare";
        public const string TemplatesSubmitReview = "templates.submit_review";
        public const string TemplatesReview = "templates.review";
        public const string TemplatesPublish = "templates.publish";
        public const string TemplatesArchive = "templates.archive";
        public const string TemplatesRestore = "templates.restore";
        public const string TemplatesDelete = "templates.delete";

        public const string AssetsView = "assets.view";
        public const string AssetsUpload = "assets.upload";
        public const string AssetsDelete = "assets.delete";

        public const string PrintIntentsView = "printintents.view";
        public const string PrintIntentsCreate = "printintents.create";
        public const string PrintIntentsHandoff = "printintents.handoff";
        public const string PrintIntentsDispatch = "printintents.dispatch";
        public const string PrintIntentsConfirm = "printintents.confirm";
        public const string PrintIntentsFail = "printintents.fail";
        public const string PrintIntentsCancel = "printintents.cancel";
    }
}
