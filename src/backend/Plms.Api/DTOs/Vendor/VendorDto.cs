namespace Plms.Api.DTOs.Vendor
{
    public class VendorDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class CreateVendorDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    public class UpdateVendorDto
    {
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
