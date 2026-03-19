namespace Plms.Api.DTOs.TemplateCategory
{
    public class TemplateCategoryDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int NextTemplateSequence { get; set; }
    }

    public class CreateTemplateCategoryDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    public class UpdateTemplateCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class TemplateCodePreviewDto
    {
        public Guid CategoryId { get; set; }
        public string CategoryCode { get; set; } = string.Empty;
        public string NextCode { get; set; } = string.Empty;
    }
}
