using System.Globalization;
using System.Text.Json;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Import;

namespace Plms.Api.Services
{
    public interface IProductImportService
    {
        Task<CsvImportReportDto> ValidateCsvAsync(Stream csvStream);
        Task<ImportSessionDetailDto> CreateImportSessionAsync(Stream csvStream, string fileName, string createdBy);
        Task<List<ImportSessionSummaryDto>> GetImportSessionsAsync();
        Task<ImportSessionDetailDto?> GetImportSessionAsync(Guid sessionId);
        Task<ImportSessionDetailDto?> EnableOverwriteAsync(Guid sessionId);
        Task<ImportCommitResultDto?> CommitImportSessionAsync(Guid sessionId, string actor, string correlationId);
    }

    public class ProductImportService : IProductImportService
    {
        private readonly ApplicationDbContext _context;

        public ProductImportService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<CsvImportReportDto> ValidateCsvAsync(Stream csvStream)
        {
            var rows = ParseCsv(csvStream);
            return await BuildReportAsync(rows);
        }

        public async Task<ImportSessionDetailDto> CreateImportSessionAsync(Stream csvStream, string fileName, string createdBy)
        {
            var rows = ParseCsv(csvStream);
            var report = await BuildReportAsync(rows);

            var session = new ImportSession
            {
                Id = Guid.NewGuid(),
                FileName = fileName,
                TotalRows = report.TotalRows,
                ValidRows = report.ValidRows,
                ErrorRows = report.ErrorRows,
                Status = report.ErrorRows == 0 ? ImportSessionStatus.ReadyToImport : ImportSessionStatus.ValidationFailed,
                AllowOverwrite = false,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                RowsJson = JsonSerializer.Serialize(rows),
                Issues = report.Errors.Select(error => new ImportSessionRowIssue
                {
                    Id = Guid.NewGuid(),
                    RowNumber = error.RowNumber,
                    Sku = error.Sku,
                    ErrorType = error.ErrorType,
                    Message = error.Message
                }).ToList()
            };

            _context.ImportSessions.Add(session);
            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "ImportSessionCreated",
                EntityId = session.Id.ToString(),
                EntityType = "ImportSession",
                UserId = createdBy,
                Details = $"Import session created for file '{fileName}' with {session.TotalRows} rows.",
                CorrelationId = Guid.NewGuid().ToString("N")
            });

            await _context.SaveChangesAsync();
            return MapSessionDetail(session);
        }

        public async Task<List<ImportSessionSummaryDto>> GetImportSessionsAsync()
        {
            var sessions = await _context.ImportSessions
                .OrderByDescending(session => session.CreatedAt)
                .ToListAsync();

            return sessions.Select(MapSessionSummary).ToList();
        }

        public async Task<ImportSessionDetailDto?> GetImportSessionAsync(Guid sessionId)
        {
            var session = await _context.ImportSessions
                .Include(s => s.Issues)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            return session == null ? null : MapSessionDetail(session);
        }

        public async Task<ImportSessionDetailDto?> EnableOverwriteAsync(Guid sessionId)
        {
            var session = await _context.ImportSessions
                .Include(s => s.Issues)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null)
            {
                return null;
            }

            var blockingIssues = session.Issues.Any(issue => issue.ErrorType != "DuplicateInDb");
            if (blockingIssues)
            {
                return MapSessionDetail(session);
            }

            session.AllowOverwrite = true;
            session.Status = ImportSessionStatus.ReadyToImport;
            await _context.SaveChangesAsync();

            return MapSessionDetail(session);
        }

        public async Task<ImportCommitResultDto?> CommitImportSessionAsync(Guid sessionId, string actor, string correlationId)
        {
            var session = await _context.ImportSessions
                .Include(s => s.Issues)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null)
            {
                return null;
            }

            if (session.Status != ImportSessionStatus.ReadyToImport)
            {
                throw new InvalidOperationException("Import session is not ready to commit.");
            }

            var rows = JsonSerializer.Deserialize<List<ProductImportRow>>(session.RowsJson) ?? new List<ProductImportRow>();
            var categoryMap = await _context.ProductCategories.ToDictionaryAsync(c => c.Code, c => c.Id);
            var vendorMap = await _context.Vendors.ToDictionaryAsync(v => v.Code, v => v.Id);

            var updatedCount = 0;
            var importedCount = 0;

            using var transaction = await _context.Database.BeginTransactionAsync();

            foreach (var row in rows)
            {
                var existingProduct = await _context.Products.FirstOrDefaultAsync(product => product.Sku == row.Sku);

                if (existingProduct != null)
                {
                    if (!session.AllowOverwrite)
                    {
                        throw new InvalidOperationException($"Duplicate SKU '{row.Sku}' cannot be overwritten without approval.");
                    }

                    existingProduct.Name = row.Name;
                    existingProduct.Description = row.Description;
                    existingProduct.CategoryId = string.IsNullOrWhiteSpace(row.CategoryCode) ? null : categoryMap[row.CategoryCode];
                    existingProduct.VendorId = string.IsNullOrWhiteSpace(row.VendorCode) ? null : vendorMap[row.VendorCode];
                    existingProduct.UpdatedAt = DateTime.UtcNow;
                    existingProduct.IsActive = true;
                    updatedCount++;
                    continue;
                }

                var newProduct = new Product
                {
                    Id = Guid.NewGuid(),
                    Sku = row.Sku,
                    Name = row.Name,
                    Description = row.Description,
                    CategoryId = string.IsNullOrWhiteSpace(row.CategoryCode) ? null : categoryMap[row.CategoryCode],
                    VendorId = string.IsNullOrWhiteSpace(row.VendorCode) ? null : vendorMap[row.VendorCode],
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Products.Add(newProduct);
                importedCount++;
            }

            session.Status = ImportSessionStatus.Imported;
            session.CompletedAt = DateTime.UtcNow;

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "ImportSessionCommitted",
                EntityId = session.Id.ToString(),
                EntityType = "ImportSession",
                UserId = actor,
                Details = $"Import session committed. Imported: {importedCount}, Updated: {updatedCount}.",
                CorrelationId = correlationId
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new ImportCommitResultDto
            {
                SessionId = session.Id,
                ImportedCount = importedCount,
                UpdatedCount = updatedCount,
                Status = session.Status.ToString()
            };
        }

        private static List<ProductImportRow> ParseCsv(Stream csvStream)
        {
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null
            };

            using var reader = new StreamReader(csvStream);
            using var csv = new CsvReader(reader, config);
            return csv.GetRecords<ProductImportRow>().ToList();
        }

        private async Task<CsvImportReportDto> BuildReportAsync(List<ProductImportRow> rows)
        {
            var report = new CsvImportReportDto
            {
                TotalRows = rows.Count
            };

            var existingSkus = await _context.Products.Select(p => p.Sku).ToListAsync();
            var categoryMap = await _context.ProductCategories.ToDictionaryAsync(c => c.Code, c => c.Id);
            var vendorMap = await _context.Vendors.ToDictionaryAsync(v => v.Code, v => v.Id);
            var seenInFile = new HashSet<string>();

            var rowNum = 1;
            foreach (var row in rows)
            {
                rowNum++;
                var hasError = false;

                if (string.IsNullOrWhiteSpace(row.Sku) || string.IsNullOrWhiteSpace(row.Name))
                {
                    report.Errors.Add(new RowValidationErrorDto
                    {
                        RowNumber = rowNum,
                        Sku = row.Sku,
                        ErrorType = "Malformed",
                        Message = "SKU and Name are required."
                    });
                    hasError = true;
                }

                if (!hasError && !seenInFile.Add(row.Sku))
                {
                    report.Errors.Add(new RowValidationErrorDto
                    {
                        RowNumber = rowNum,
                        Sku = row.Sku,
                        ErrorType = "DuplicateInFile",
                        Message = "SKU appears multiple times in the CSV."
                    });
                    hasError = true;
                }

                if (!hasError && existingSkus.Contains(row.Sku))
                {
                    report.Errors.Add(new RowValidationErrorDto
                    {
                        RowNumber = rowNum,
                        Sku = row.Sku,
                        ErrorType = "DuplicateInDb",
                        Message = "SKU already exists in the system."
                    });
                    hasError = true;
                }

                if (!hasError && !string.IsNullOrWhiteSpace(row.CategoryCode) && !categoryMap.ContainsKey(row.CategoryCode))
                {
                    report.Errors.Add(new RowValidationErrorDto
                    {
                        RowNumber = rowNum,
                        Sku = row.Sku,
                        ErrorType = "InvalidReference",
                        Message = $"Category Code '{row.CategoryCode}' not found."
                    });
                    hasError = true;
                }

                if (!hasError && !string.IsNullOrWhiteSpace(row.VendorCode) && !vendorMap.ContainsKey(row.VendorCode))
                {
                    report.Errors.Add(new RowValidationErrorDto
                    {
                        RowNumber = rowNum,
                        Sku = row.Sku,
                        ErrorType = "InvalidReference",
                        Message = $"Vendor Code '{row.VendorCode}' not found."
                    });
                    hasError = true;
                }

                if (hasError) report.ErrorRows++;
                else report.ValidRows++;
            }

            return report;
        }

        private static ImportSessionSummaryDto MapSessionSummary(ImportSession session)
        {
            return new ImportSessionSummaryDto
            {
                Id = session.Id,
                FileName = session.FileName,
                Status = session.Status.ToString(),
                AllowOverwrite = session.AllowOverwrite,
                TotalRows = session.TotalRows,
                ValidRows = session.ValidRows,
                ErrorRows = session.ErrorRows,
                CreatedBy = session.CreatedBy,
                CreatedAt = session.CreatedAt,
                CompletedAt = session.CompletedAt
            };
        }

        private static ImportSessionDetailDto MapSessionDetail(ImportSession session)
        {
            return new ImportSessionDetailDto
            {
                Id = session.Id,
                FileName = session.FileName,
                Status = session.Status.ToString(),
                AllowOverwrite = session.AllowOverwrite,
                TotalRows = session.TotalRows,
                ValidRows = session.ValidRows,
                ErrorRows = session.ErrorRows,
                CreatedBy = session.CreatedBy,
                CreatedAt = session.CreatedAt,
                CompletedAt = session.CompletedAt,
                Issues = session.Issues
                    .OrderBy(issue => issue.RowNumber)
                    .Select(issue => new ImportSessionIssueDto
                    {
                        RowNumber = issue.RowNumber,
                        Sku = issue.Sku,
                        ErrorType = issue.ErrorType,
                        Message = issue.Message
                    })
                    .ToList()
            };
        }
    }
}
