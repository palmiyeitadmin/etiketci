namespace Plms.Api.DTOs.Import
{
    public class CsvImportReportDto
    {
        public int TotalRows { get; set; }
        public int ValidRows { get; set; }
        public int ErrorRows { get; set; }
        public List<RowValidationErrorDto> Errors { get; set; } = new();
    }

    public class RowValidationErrorDto
    {
        public int RowNumber { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string ErrorType { get; set; } = string.Empty; // e.g., "DuplicateSku", "InvalidCategory", "Malformed"
        public string Message { get; set; } = string.Empty;
    }

    public class ProductImportRow
    {
        public string Sku { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CategoryCode { get; set; } = string.Empty;
        public string VendorCode { get; set; } = string.Empty;
    }
}
