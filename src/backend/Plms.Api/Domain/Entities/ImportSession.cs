using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Plms.Api.Domain.Enums;

namespace Plms.Api.Domain.Entities
{
    public class ImportSession
    {
        public Guid Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        public int TotalRows { get; set; }
        public int ValidRows { get; set; }
        public int ErrorRows { get; set; }

        public ImportSessionStatus Status { get; set; } = ImportSessionStatus.ValidationFailed;

        public bool AllowOverwrite { get; set; }

        [Required]
        [MaxLength(150)]
        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        [Column(TypeName = "jsonb")]
        public string RowsJson { get; set; } = "[]";

        public ICollection<ImportSessionRowIssue> Issues { get; set; } = new List<ImportSessionRowIssue>();
    }
}
