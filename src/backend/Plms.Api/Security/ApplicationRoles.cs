namespace Plms.Api.Security
{
    public static class ApplicationRoles
    {
        public const string Admin = "Admin";
        public const string Editor = "Editor";
        public const string User = "User";
        public const string ApprovalReviewer = "Approval Reviewer";

        public static readonly string[] DefaultSystemRoles = { Admin, Editor, User };
    }
}
