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

    public class ImportSessionSummaryDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool AllowOverwrite { get; set; }
        public int TotalRows { get; set; }
        public int ValidRows { get; set; }
        public int ErrorRows { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    public class ImportSessionIssueDto : RowValidationErrorDto
    {
    }

    public class ImportSessionDetailDto : ImportSessionSummaryDto
    {
        public List<ImportSessionIssueDto> Issues { get; set; } = new();
    }

    public class ImportCommitResultDto
    {
        public Guid SessionId { get; set; }
        public int ImportedCount { get; set; }
        public int UpdatedCount { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
