using System.ComponentModel.DataAnnotations;

namespace Plms.Api.Domain.Entities
{
    public class ImportSessionRowIssue
    {
        public Guid Id { get; set; }

        public Guid ImportSessionId { get; set; }
        public ImportSession? ImportSession { get; set; }

        public int RowNumber { get; set; }

        [MaxLength(100)]
        public string Sku { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string ErrorType { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Message { get; set; } = string.Empty;
    }
}
