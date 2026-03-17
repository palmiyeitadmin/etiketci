using Plms.Api.DTOs.Auth;

namespace Plms.Api.Security
{
    public static class PermissionCatalog
    {
        public static readonly IReadOnlyList<PermissionCatalogGroupDto> Groups = new List<PermissionCatalogGroupDto>
        {
            new()
            {
                Key = "dashboard",
                Label = "Dashboard",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.DashboardView, Label = "View dashboard", Description = "View operational dashboard and summary metrics." }
                }
            },
            new()
            {
                Key = "audit",
                Label = "Audit",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.AuditView, Label = "View audit logs", Description = "Inspect system audit records and correlation traces." }
                }
            },
            new()
            {
                Key = "users",
                Label = "Users",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.UsersView, Label = "View users", Description = "View user directory and user details." },
                    new PermissionCatalogItemDto { Key = Permissions.UsersCreate, Label = "Create users", Description = "Create users with invite or direct onboarding flows." },
                    new PermissionCatalogItemDto { Key = Permissions.UsersEdit, Label = "Edit users", Description = "Edit user profile, roles and activation state." },
                    new PermissionCatalogItemDto { Key = Permissions.UsersActivate, Label = "Activate users", Description = "Activate or deactivate users." },
                    new PermissionCatalogItemDto { Key = Permissions.UsersResetPassword, Label = "Reset passwords", Description = "Issue setup links or temporary passwords." },
                    new PermissionCatalogItemDto { Key = Permissions.UsersAssignRoles, Label = "Assign roles", Description = "Assign or change role memberships for users." }
                }
            },
            new()
            {
                Key = "roles",
                Label = "Roles",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.RolesView, Label = "View roles", Description = "View roles and their permission assignments." },
                    new PermissionCatalogItemDto { Key = Permissions.RolesCreate, Label = "Create roles", Description = "Create custom role groups." },
                    new PermissionCatalogItemDto { Key = Permissions.RolesEdit, Label = "Edit roles", Description = "Edit role metadata and permissions." },
                    new PermissionCatalogItemDto { Key = Permissions.RolesDelete, Label = "Delete roles", Description = "Delete custom roles that are no longer assigned." },
                    new PermissionCatalogItemDto { Key = Permissions.RolesAssignPermissions, Label = "Assign permissions", Description = "Manage permission sets for roles." }
                }
            },
            new()
            {
                Key = "products",
                Label = "Products",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.ProductsView, Label = "View products", Description = "View products and product details." },
                    new PermissionCatalogItemDto { Key = Permissions.ProductsCreate, Label = "Create products", Description = "Create new products." },
                    new PermissionCatalogItemDto { Key = Permissions.ProductsEdit, Label = "Edit products", Description = "Update products and product-template links." },
                    new PermissionCatalogItemDto { Key = Permissions.ProductsDelete, Label = "Delete products", Description = "Delete products when governance allows it." },
                    new PermissionCatalogItemDto { Key = Permissions.ProductsImport, Label = "Import products", Description = "Run CSV import, review sessions and commit product imports." }
                }
            },
            new()
            {
                Key = "vendors",
                Label = "Vendors",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.VendorsView, Label = "View vendors", Description = "View vendors." },
                    new PermissionCatalogItemDto { Key = Permissions.VendorsManage, Label = "Manage vendors", Description = "Create, edit and remove vendors." }
                }
            },
            new()
            {
                Key = "categories",
                Label = "Categories",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.CategoriesView, Label = "View categories", Description = "View product categories." },
                    new PermissionCatalogItemDto { Key = Permissions.CategoriesManage, Label = "Manage categories", Description = "Create, edit and remove categories." }
                }
            },
            new()
            {
                Key = "templates",
                Label = "Templates",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesView, Label = "View templates", Description = "View templates and lifecycle details." },
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesCreate, Label = "Create templates", Description = "Create templates and initial drafts." },
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesEdit, Label = "Edit templates", Description = "Edit drafts or create revisions from immutable versions." },
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesPreview, Label = "Preview templates", Description = "Generate preview and ad-hoc PDF output." },
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesCompare, Label = "Compare templates", Description = "Compare template versions." },
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesSubmitReview, Label = "Submit review", Description = "Submit drafts to review." },
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesReview, Label = "Review templates", Description = "Approve or reject in-review versions." },
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesPublish, Label = "Publish templates", Description = "Publish approved template versions." },
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesArchive, Label = "Archive templates", Description = "Archive or deprecate template versions." },
                    new PermissionCatalogItemDto { Key = Permissions.TemplatesRestore, Label = "Restore templates", Description = "Request or review restoration of deprecated or archived versions." }
                }
            },
            new()
            {
                Key = "assets",
                Label = "Assets",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.AssetsView, Label = "View assets", Description = "Browse and reuse shared uploaded assets." },
                    new PermissionCatalogItemDto { Key = Permissions.AssetsUpload, Label = "Upload assets", Description = "Upload shared images into the content library." },
                    new PermissionCatalogItemDto { Key = Permissions.AssetsDelete, Label = "Delete assets", Description = "Delete shared assets from the content library." }
                }
            },
            new()
            {
                Key = "printintents",
                Label = "Print Intents",
                Items =
                {
                    new PermissionCatalogItemDto { Key = Permissions.PrintIntentsView, Label = "View print intents", Description = "View print intent queue and details." },
                    new PermissionCatalogItemDto { Key = Permissions.PrintIntentsCreate, Label = "Create print intents", Description = "Create new print intents from approved or published versions." },
                    new PermissionCatalogItemDto { Key = Permissions.PrintIntentsHandoff, Label = "Confirm handoff", Description = "Confirm print intent handoff after safety checks." },
                    new PermissionCatalogItemDto { Key = Permissions.PrintIntentsDispatch, Label = "Dispatch PDF", Description = "Dispatch print PDFs to the client print flow." },
                    new PermissionCatalogItemDto { Key = Permissions.PrintIntentsConfirm, Label = "Confirm print", Description = "Confirm successful print completion." },
                    new PermissionCatalogItemDto { Key = Permissions.PrintIntentsFail, Label = "Mark failed", Description = "Record failed print attempts." },
                    new PermissionCatalogItemDto { Key = Permissions.PrintIntentsCancel, Label = "Cancel print intent", Description = "Cancel pending or ready print intents." }
                }
            }
        };

        public static IReadOnlyCollection<string> AllPermissionKeys { get; } =
            Groups.SelectMany(group => group.Items).Select(item => item.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);

        public static IReadOnlyCollection<string> AdminPermissions => AllPermissionKeys;

        public static IReadOnlyCollection<string> EditorPermissions { get; } = new[]
        {
            Permissions.DashboardView,
            Permissions.ProductsView,
            Permissions.ProductsCreate,
            Permissions.ProductsEdit,
            Permissions.ProductsImport,
            Permissions.VendorsView,
            Permissions.VendorsManage,
            Permissions.CategoriesView,
            Permissions.CategoriesManage,
            Permissions.TemplatesView,
            Permissions.TemplatesCreate,
            Permissions.TemplatesEdit,
            Permissions.TemplatesPreview,
            Permissions.TemplatesCompare,
            Permissions.TemplatesSubmitReview,
            Permissions.AssetsView,
            Permissions.AssetsUpload,
            Permissions.PrintIntentsView,
            Permissions.PrintIntentsCreate,
            Permissions.PrintIntentsHandoff,
            Permissions.PrintIntentsDispatch,
            Permissions.PrintIntentsConfirm,
            Permissions.PrintIntentsFail,
            Permissions.PrintIntentsCancel
        };

        public static IReadOnlyCollection<string> UserPermissions { get; } = new[]
        {
            Permissions.DashboardView,
            Permissions.ProductsView,
            Permissions.VendorsView,
            Permissions.CategoriesView,
            Permissions.TemplatesView,
            Permissions.TemplatesPreview,
            Permissions.TemplatesCompare,
            Permissions.PrintIntentsView
        };

        public static IReadOnlyCollection<string> ApprovalReviewerPermissions { get; } = new[]
        {
            Permissions.DashboardView,
            Permissions.TemplatesView,
            Permissions.TemplatesPreview,
            Permissions.TemplatesCompare,
            Permissions.TemplatesReview,
            Permissions.TemplatesPublish,
            Permissions.PrintIntentsView
        };
    }
}
