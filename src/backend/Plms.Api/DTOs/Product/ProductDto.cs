namespace Plms.Api.DTOs.Product
{
    public class ProductDto
    {
        public Guid Id { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public Guid? CategoryId { get; set; }
        public Guid? VendorId { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public string? CategoryName { get; set; }
        public string? VendorName { get; set; }
    }

    public class CreateProductDto
    {
        public string Sku { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public Guid? CategoryId { get; set; }
        public Guid? VendorId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateProductDto
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public Guid? CategoryId { get; set; }
        public Guid? VendorId { get; set; }
        public bool IsActive { get; set; }
    }
}
