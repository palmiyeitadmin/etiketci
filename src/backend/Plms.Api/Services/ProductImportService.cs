using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.DTOs.Import;

namespace Plms.Api.Services
{
    public interface IProductImportService
    {
        Task<CsvImportReportDto> ValidateCsvAsync(Stream csvStream);
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
            var report = new CsvImportReportDto();
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null
            };

            using var reader = new StreamReader(csvStream);
            using var csv = new CsvReader(reader, config);

            var rows = csv.GetRecords<ProductImportRow>().ToList();
            report.TotalRows = rows.Count;

            // Pre-fetch relevant data for faster validation
            var existingSkus = await _context.Products.Select(p => p.Sku).ToListAsync();
            var categoryMap = await _context.ProductCategories.ToDictionaryAsync(c => c.Code, c => c.Id);
            var vendorMap = await _context.Vendors.ToDictionaryAsync(v => v.Code, v => v.Id);

            var seenInFile = new HashSet<string>();

            int rowNum = 1; // Header is usually considered row 0 or 1, we'll use 1-based for data
            foreach (var row in rows)
            {
                rowNum++;
                bool hasError = false;

                // 1. Basic Malformed / Required Checks
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

                // 2. Duplicate in File
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

                // 3. Duplicate in DB
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

                // 4. Reference Checks
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
    }
}
