using Microsoft.AspNetCore.Mvc;
using Plms.Api.DTOs.Assets;
using Plms.Api.Security;
using Plms.Api.Services;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/assets")]
    public class AssetsController : ControllerBase
    {
        private const long MaxAssetUploadBytes = 5 * 1024 * 1024;
        private readonly IAssetStorageService _assetStorageService;

        public AssetsController(IAssetStorageService assetStorageService)
        {
            _assetStorageService = assetStorageService;
        }

        [HttpGet]
        [HasPermission(Permissions.AssetsView)]
        public async Task<IActionResult> GetAssets([FromQuery] string? query, [FromQuery] int page = 1, [FromQuery] int pageSize = 24, CancellationToken cancellationToken = default)
        {
            var assets = await _assetStorageService.QueryAsync(query, page, pageSize, cancellationToken);
            return Ok(new
            {
                success = true,
                data = assets.Select(MapListItem).ToList()
            });
        }

        [HttpGet("{id}")]
        [HasPermission(Permissions.AssetsView)]
        public async Task<IActionResult> GetAsset(Guid id, CancellationToken cancellationToken)
        {
            var asset = await _assetStorageService.GetByIdAsync(id, cancellationToken);
            if (asset == null)
            {
                return NotFound(new { success = false, error = "Asset not found." });
            }

            return Ok(new { success = true, data = MapDetail(asset) });
        }

        [HttpGet("{id}/content")]
        [HasPermission(Permissions.AssetsView)]
        public async Task<IActionResult> GetAssetContent(Guid id, CancellationToken cancellationToken)
        {
            var asset = await _assetStorageService.GetByIdAsync(id, cancellationToken);
            if (asset == null)
            {
                return NotFound(new { success = false, error = "Asset not found." });
            }

            return File(asset.StorageData, asset.MimeType, enableRangeProcessing: false);
        }

        [HttpPost]
        [HasPermission(Permissions.AssetsUpload)]
        [RequestSizeLimit(MaxAssetUploadBytes + 256 * 1024)]
        public async Task<IActionResult> UploadAsset(IFormFile file, CancellationToken cancellationToken)
        {
            if (file == null)
            {
                return BadRequest(new { success = false, error = "File is required." });
            }

            try
            {
                var actor = User.Identity?.Name ?? "System";
                var (asset, deduplicated) = await _assetStorageService.CreateOrReuseAsync(file, actor, cancellationToken);
                var response = new CreateContentAssetResponseDto
                {
                    Deduplicated = deduplicated,
                    Asset = MapDetail(asset)
                };
                return Ok(new { success = true, data = response });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [HasPermission(Permissions.AssetsDelete)]
        public async Task<IActionResult> DeleteAsset(Guid id, CancellationToken cancellationToken)
        {
            var deleted = await _assetStorageService.SoftDeleteAsync(id, User.Identity?.Name ?? "System", cancellationToken);
            if (!deleted)
            {
                return NotFound(new { success = false, error = "Asset not found." });
            }

            return Ok(new { success = true });
        }

        private static ContentAssetListItemDto MapListItem(Domain.Entities.ContentAsset asset) => new()
        {
            Id = asset.Id,
            Name = asset.Name,
            Kind = asset.Kind,
            MimeType = asset.MimeType,
            FileName = asset.FileName,
            ByteSize = asset.ByteSize,
            WidthPx = asset.WidthPx,
            HeightPx = asset.HeightPx,
            CreatedAt = asset.CreatedAt,
            CreatedBy = asset.CreatedBy,
            IsActive = asset.IsActive
        };

        private static ContentAssetDetailDto MapDetail(Domain.Entities.ContentAsset asset) => new()
        {
            Id = asset.Id,
            Name = asset.Name,
            Kind = asset.Kind,
            MimeType = asset.MimeType,
            FileName = asset.FileName,
            ByteSize = asset.ByteSize,
            WidthPx = asset.WidthPx,
            HeightPx = asset.HeightPx,
            CreatedAt = asset.CreatedAt,
            CreatedBy = asset.CreatedBy,
            UpdatedAt = asset.UpdatedAt,
            UpdatedBy = asset.UpdatedBy,
            IsActive = asset.IsActive,
            Sha256Hash = asset.Sha256Hash,
            TagsJson = asset.TagsJson
        };
    }
}
