namespace Plms.Api.DTOs.ProductCategory
{
    public class ProductCategoryDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class CreateProductCategoryDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    public class UpdateProductCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
