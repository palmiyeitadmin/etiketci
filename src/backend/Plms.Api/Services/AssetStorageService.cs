using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.DTOs.Assets;
using SkiaSharp;

namespace Plms.Api.Services
{
    public interface IAssetStorageService
    {
        Task<(ContentAsset asset, bool deduplicated)> CreateOrReuseAsync(IFormFile file, string actor, CancellationToken cancellationToken);
        Task<List<ContentAsset>> QueryAsync(string? query, int page, int pageSize, CancellationToken cancellationToken);
        Task<ContentAsset?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
        Task<bool> SoftDeleteAsync(Guid id, string actor, CancellationToken cancellationToken);
    }

    public class AssetStorageService : IAssetStorageService
    {
        private const long MaxAssetUploadBytes = 5 * 1024 * 1024;
        private static readonly HashSet<string> SupportedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/png",
            "image/jpeg",
            "image/svg+xml"
        };

        private readonly ApplicationDbContext _context;

        public AssetStorageService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<(ContentAsset asset, bool deduplicated)> CreateOrReuseAsync(IFormFile file, string actor, CancellationToken cancellationToken)
        {
            if (file.Length <= 0)
            {
                throw new InvalidOperationException("Empty files are not allowed.");
            }

            if (!SupportedMimeTypes.Contains(file.ContentType))
            {
                throw new InvalidOperationException("Only PNG, JPEG and SVG assets are supported.");
            }

            if (file.Length > MaxAssetUploadBytes)
            {
                throw new InvalidOperationException("Asset must be 5MB or smaller.");
            }

            await using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream, cancellationToken);
            var bytes = memoryStream.ToArray();
            var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

            var existing = await _context.ContentAssets.FirstOrDefaultAsync(
                asset => asset.Sha256Hash == hash && asset.ByteSize == file.Length && asset.IsActive,
                cancellationToken);

            if (existing != null)
            {
                return (existing, true);
            }

            var (widthPx, heightPx) = TryGetDimensions(bytes, file.ContentType);
            var asset = new ContentAsset
            {
                Id = Guid.NewGuid(),
                Name = Path.GetFileNameWithoutExtension(file.FileName),
                Kind = "UploadedImage",
                MimeType = file.ContentType,
                FileName = file.FileName,
                ByteSize = file.Length,
                Sha256Hash = hash,
                WidthPx = widthPx,
                HeightPx = heightPx,
                StorageData = bytes,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = actor,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = actor,
                IsActive = true
            };

            _context.ContentAssets.Add(asset);
            await _context.SaveChangesAsync(cancellationToken);
            return (asset, false);
        }

        public async Task<List<ContentAsset>> QueryAsync(string? query, int page, int pageSize, CancellationToken cancellationToken)
        {
            var normalizedPage = Math.Max(1, page);
            var normalizedPageSize = Math.Clamp(pageSize, 1, 60);

            var assetQuery = _context.ContentAssets
                .Where(asset => asset.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var search = query.Trim().ToLowerInvariant();
                assetQuery = assetQuery.Where(asset =>
                    asset.Name.ToLower().Contains(search) ||
                    asset.FileName.ToLower().Contains(search) ||
                    (asset.TagsJson != null && asset.TagsJson.ToLower().Contains(search)));
            }

            return await assetQuery
                .OrderByDescending(asset => asset.UpdatedAt)
                .Skip((normalizedPage - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .ToListAsync(cancellationToken);
        }

        public Task<ContentAsset?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
            _context.ContentAssets.FirstOrDefaultAsync(asset => asset.Id == id && asset.IsActive, cancellationToken);

        public async Task<bool> SoftDeleteAsync(Guid id, string actor, CancellationToken cancellationToken)
        {
            var asset = await GetByIdAsync(id, cancellationToken);
            if (asset == null)
            {
                return false;
            }

            asset.IsActive = false;
            asset.UpdatedAt = DateTime.UtcNow;
            asset.UpdatedBy = actor;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        private static (int? widthPx, int? heightPx) TryGetDimensions(byte[] bytes, string mimeType)
        {
            if (string.Equals(mimeType, "image/svg+xml", StringComparison.OrdinalIgnoreCase))
            {
                return (null, null);
            }

            using var codec = SKCodec.Create(new SKMemoryStream(bytes));
            return codec == null ? (null, null) : (codec.Info.Width, codec.Info.Height);
        }
    }
}
