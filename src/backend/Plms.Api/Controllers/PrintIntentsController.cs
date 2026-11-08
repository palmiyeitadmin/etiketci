using Plms.Api.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Operational;
using Plms.Api.Models.Canonical;
using Plms.Api.Models.Operational;
using Plms.Api.Services;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Plms.Api.Controllers
{
    /// <summary>
    /// Print requests: Pending → ReadyForPrint → SentToClient → UserPrinted / Failed (or Cancelled before printing).
    /// At dispatch the label is resolved against the product and stored as <see cref="PrintIntent.PrintedPayload"/>;
    /// the print PDF (one page per label) is always rendered from that snapshot, so reprints are identical.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class PrintIntentsController : ControllerBase
    {
        private static readonly JsonSerializerOptions ReadOptions = new() { PropertyNameCaseInsensitive = true };
        // Stored labels keep Turkish characters readable in the database; the payload is never embedded in HTML.
        private static readonly JsonSerializerOptions WriteOptions = new(JsonSerializerDefaults.Web) { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

        private readonly ApplicationDbContext _context;
        private readonly IPreviewReadinessService _readinessService;
        private readonly IFinalSafetyCheckService _safetyService;
        private readonly ILabelRenderService _renderService;
        private readonly IVariableResolutionService _variableService;

        public PrintIntentsController(
            ApplicationDbContext context,
            IPreviewReadinessService readinessService,
            IFinalSafetyCheckService safetyService,
            ILabelRenderService renderService,
            IVariableResolutionService variableService)
        {
            _context = context;
            _readinessService = readinessService;
            _safetyService = safetyService;
            _renderService = renderService;
            _variableService = variableService;
        }

        private string CurrentUser => User.Identity?.Name ?? "System";

        [HttpGet]
        [HasPermission(Permissions.PrintIntentsView)]
        public async Task<IActionResult> GetPrintIntents(
            [FromQuery] string? status,
            [FromQuery] int? awaitingOlderThanMinutes,
            [FromQuery] Guid? productId,
            [FromQuery] Guid? reprintOf,
            [FromQuery] string? search,
            [FromQuery] bool mine = false,
            [FromQuery] int? page = null,
            [FromQuery] int pageSize = 50)
        {
            var query = _context.PrintIntents.AsNoTracking().AsQueryable();

            if (productId.HasValue) query = query.Where(pi => pi.ProductId == productId);
            if (reprintOf.HasValue) query = query.Where(pi => pi.ReprintOfId == reprintOf);
            if (mine)
            {
                var user = CurrentUser;
                query = query.Where(pi => pi.RequestedBy == user);
            }
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(pi =>
                    pi.Product!.Name.ToLower().Contains(term) ||
                    pi.Product!.Sku.ToLower().Contains(term) ||
                    pi.Template!.Name.ToLower().Contains(term) ||
                    pi.RequestedBy.ToLower().Contains(term));
            }

            // Counts per status for filter tabs, before the status filter itself is applied.
            var counts = page.HasValue
                ? await query.GroupBy(pi => pi.Status).Select(group => new { Status = group.Key, Count = group.Count() }).ToDictionaryAsync(row => row.Status, row => row.Count)
                : null;

            if (!string.IsNullOrWhiteSpace(status))
            {
                var statuses = status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                query = query.Where(pi => statuses.Contains(pi.Status));
            }
            if (awaitingOlderThanMinutes.HasValue)
            {
                var cutoff = DateTime.UtcNow.AddMinutes(-awaitingOlderThanMinutes.Value);
                query = query.Where(pi => pi.Status == PrintIntentStatuses.SentToClient && pi.DispatchedAt <= cutoff);
            }

            var ordered = query.OrderByDescending(pi => pi.CreatedAt);
            var projected = ordered.Select(pi => new PrintIntentDto
            {
                Id = pi.Id,
                ProductId = pi.ProductId,
                ProductName = pi.Product!.Name,
                ProductSku = pi.Product!.Sku,
                TemplateId = pi.TemplateId,
                TemplateName = pi.Template!.Name,
                TemplateCode = pi.Template!.Code,
                VersionId = pi.VersionId,
                VersionNumber = pi.Version!.VersionNumber,
                Quantity = pi.Quantity,
                Status = pi.Status,
                RequestedBy = pi.RequestedBy,
                CreatedAt = pi.CreatedAt,
                ReadinessSnapshot = pi.ReadinessSnapshot,
                OperatorReviewedAt = pi.OperatorReviewedAt,
                OperatorReviewedBy = pi.OperatorReviewedBy,
                DispatchedAt = pi.DispatchedAt,
                DispatchedBy = pi.DispatchedBy,
                CompletedAt = pi.CompletedAt,
                CompletedBy = pi.CompletedBy,
                FailureReason = pi.FailureReason,
                SourceVersionStatus = pi.SourceVersionStatus,
                HasPrintedPayload = pi.PrintedPayload != null,
                ReprintOfId = pi.ReprintOfId,
                ReprintReason = pi.ReprintReason,
                ReprintNote = pi.ReprintNote,
                FailureCategory = pi.FailureCategory,
                PrintedQuantity = pi.PrintedQuantity,
                Channel = pi.Channel,
            });

            if (!page.HasValue)
            {
                // Unpaged form kept for older callers.
                return Ok(new { success = true, data = await projected.ToListAsync() });
            }

            var size = Math.Clamp(pageSize, 1, 200);
            var current = Math.Max(1, page.Value);
            var total = await query.CountAsync();
            var items = await projected.Skip((current - 1) * size).Take(size).ToListAsync();
            return Ok(new { success = true, data = new { items, total, page = current, pageSize = size, counts } });
        }

        [HttpPost]
        [HasPermission(Permissions.PrintIntentsCreate)]
        public async Task<IActionResult> CreatePrintIntent(CreatePrintIntentDto dto)
        {
            if (!IsValidQuantity(dto.Quantity, out var quantityError)) return BadRequest(quantityError);

            // Category and Vendor feed the {{product.category}} / {{product.vendor}} variables.
            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Vendor)
                .FirstOrDefaultAsync(p => p.Id == dto.ProductId);
            if (product == null) return NotFound(ApiError.Of("product_not_found", "Product not found."));

            var template = await _context.Templates.FindAsync(dto.TemplateId);
            if (template == null) return NotFound(ApiError.Of("template_not_found", "Template not found."));

            var version = await _context.TemplateVersions.FirstOrDefaultAsync(v => v.Id == dto.VersionId && v.TemplateId == dto.TemplateId);
            if (version == null) return NotFound(ApiError.Of("template_version_not_found", "Template version not found."));

            if (version.Status != TemplateStatus.Published && version.Status != TemplateStatus.Approved)
            {
                return BadRequest(ApiError.Of("template_version_not_printable", "Only Approved or Published template versions can be used for print intents.", new { status = version.Status }));
            }

            var readiness = await _readinessService.EvaluateReadinessAsync(version, product);
            if (readiness.Status == ReadinessStatus.Blocked)
            {
                return BadRequest(new { success = false, error = "Intent creation blocked.", code = "readiness_blocked", details = readiness.Errors, issues = readiness.Issues });
            }

            var pi = NewIntent(product, template, version, dto.Quantity, readiness, channel: null);
            _context.PrintIntents.Add(pi);
            AuditCreated(pi);

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = new { id = pi.Id } });
        }

        /// <summary>
        /// Print station: create, confirm readiness and dispatch in one step for the template's published version.
        /// Every step is still checked and audited; nothing is saved if any step fails.
        /// </summary>
        [HttpPost("quick")]
        [HasPermission(Permissions.PrintIntentsCreate)]
        [HasPermission(Permissions.PrintIntentsHandoff)]
        [HasPermission(Permissions.PrintIntentsDispatch)]
        public async Task<IActionResult> QuickPrint(QuickPrintDto dto)
        {
            if (!IsValidQuantity(dto.Quantity, out var quantityError)) return BadRequest(quantityError);

            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Vendor)
                .FirstOrDefaultAsync(p => p.Id == dto.ProductId);
            if (product == null) return NotFound(ApiError.Of("product_not_found", "Product not found."));
            if (!product.IsActive) return BadRequest(ApiError.Of("product_inactive", "Product is inactive."));

            var template = await _context.Templates.FirstOrDefaultAsync(t => t.Id == dto.TemplateId);
            if (template == null) return NotFound(ApiError.Of("template_not_found", "Template not found."));
            if (template.IsArchived || template.CurrentActiveVersionId == null)
            {
                return BadRequest(ApiError.Of("template_not_published", "Template has no published version."));
            }

            var version = await _context.TemplateVersions.FirstOrDefaultAsync(v => v.Id == template.CurrentActiveVersionId);
            if (version == null || version.Status != TemplateStatus.Published)
            {
                return BadRequest(ApiError.Of("template_not_published", "Template has no published version."));
            }

            var readiness = await _readinessService.EvaluateReadinessAsync(version, product);
            if (readiness.Status == ReadinessStatus.Blocked)
            {
                return BadRequest(new { success = false, error = "Intent creation blocked.", code = "readiness_blocked", details = readiness.Errors, issues = readiness.Issues });
            }

            var pi = NewIntent(product, template, version, dto.Quantity, readiness, channel: "station");

            var safetyCheck = await _safetyService.EvaluateIntentSafetyAsync(pi);
            if (!safetyCheck.IsSafe)
            {
                return BadRequest(new { success = false, error = "Final safety check failed.", code = "safety_check_failed", details = safetyCheck });
            }

            var snapshotError = CaptureSnapshot(pi);
            if (snapshotError != null)
            {
                return BadRequest(snapshotError);
            }

            var now = DateTime.UtcNow;
            pi.Status = PrintIntentStatuses.SentToClient;
            pi.OperatorReviewedAt = now;
            pi.OperatorReviewedBy = CurrentUser;
            pi.DispatchedAt = now;
            pi.DispatchedBy = CurrentUser;

            _context.PrintIntents.Add(pi);
            AuditCreated(pi);
            Audit("PrintIntentHandoffConfirmed", pi, "Readiness confirmed at the print station.", new { channel = "station" });
            AuditDispatched(pi);

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = await DetailAsync(pi, safetyCheck) });
        }

        [HttpGet("{id}")]
        [HasPermission(Permissions.PrintIntentsView)]
        public async Task<IActionResult> GetPrintIntent(Guid id)
        {
            var pi = await LoadAsync(id);
            if (pi == null) return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));

            var safetyCheck = await _safetyService.EvaluateIntentSafetyAsync(pi);
            return Ok(new { success = true, data = await DetailAsync(pi, safetyCheck) });
        }

        [HttpPost("{id}/handoff")]
        [HasPermission(Permissions.PrintIntentsHandoff)]
        public async Task<IActionResult> ConfirmHandoff(Guid id)
        {
            var pi = await LoadAsync(id);
            if (pi == null) return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));

            if (pi.Status != PrintIntentStatuses.Pending)
            {
                return BadRequest(ApiError.Of("intent_cannot_confirm", $"Intent cannot be confirmed because it is in '{pi.Status}' state.", new { status = pi.Status }));
            }

            var safetyCheck = await _safetyService.EvaluateIntentSafetyAsync(pi);
            if (!safetyCheck.IsSafe)
            {
                Audit("PrintIntentHandoffFailed", pi, $"Safety check failed: {string.Join(", ", safetyCheck.Messages)}", new { messages = safetyCheck.Messages, issues = safetyCheck.Issues.Select(issue => issue.Code) });
                await _context.SaveChangesAsync();
                return BadRequest(new { success = false, error = "Final safety check failed.", code = "safety_check_failed", details = safetyCheck });
            }

            pi.Status = PrintIntentStatuses.ReadyForPrint;
            pi.OperatorReviewedAt = DateTime.UtcNow;
            pi.OperatorReviewedBy = CurrentUser;
            Audit("PrintIntentHandoffConfirmed", pi, "Operator confirmed readiness. Intent is now ReadyForPrint.");

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = await DetailAsync(pi, safetyCheck) });
        }

        /// <summary>Resolves and stores the label (unless it is a reprint, which already has one) and releases it for printing.</summary>
        [HttpPost("{id}/dispatch-pdf")]
        [HasPermission(Permissions.PrintIntentsDispatch)]
        public async Task<IActionResult> DispatchPdf(Guid id)
        {
            var pi = await LoadAsync(id);
            if (pi == null) return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));

            if (pi.Status != PrintIntentStatuses.ReadyForPrint)
            {
                return BadRequest(ApiError.Of("intent_cannot_dispatch", $"Intent cannot be dispatched because it is in '{pi.Status}' state.", new { status = pi.Status }));
            }

            FinalSafetyCheckResult? safetyCheck = null;
            if (pi.PrintedPayload == null)
            {
                safetyCheck = await _safetyService.EvaluateIntentSafetyAsync(pi);
                if (!safetyCheck.IsSafe)
                {
                    return BadRequest(new { success = false, error = "Final safety check failed.", code = "safety_check_failed", details = safetyCheck });
                }

                var snapshotError = CaptureSnapshot(pi);
                if (snapshotError != null)
                {
                    return BadRequest(snapshotError);
                }
            }
            else if (pi.Template?.IsArchived == true || pi.Version?.Status == TemplateStatus.Archived)
            {
                return BadRequest(ApiError.Of("template_or_version_archived", "The template or version of this reprint has been archived."));
            }

            pi.Status = PrintIntentStatuses.SentToClient;
            pi.DispatchedAt = DateTime.UtcNow;
            pi.DispatchedBy = CurrentUser;
            AuditDispatched(pi);

            await _context.SaveChangesAsync();
            safetyCheck ??= await _safetyService.EvaluateIntentSafetyAsync(pi);
            return Ok(new { success = true, data = await DetailAsync(pi, safetyCheck) });
        }

        /// <summary>
        /// The print PDF: the stored label, one page per copy. Only while the request is waiting to be printed;
        /// after the outcome is recorded, printing again goes through a reprint so it is counted.
        /// </summary>
        [HttpGet("{id}/pdf")]
        [HasPermission(Permissions.PrintIntentsDispatch)]
        public async Task<IActionResult> GetPrintPdf(Guid id)
        {
            var pi = await LoadAsync(id);
            if (pi == null) return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));

            if (pi.Status != PrintIntentStatuses.SentToClient)
            {
                return Conflict(ApiError.Of("print_pdf_unavailable", "The print PDF is only available while the request is waiting to be printed."));
            }

            if (pi.PrintedPayload == null)
            {
                return Conflict(ApiError.Of("no_stored_label", "This request has no stored label. Create a new print request."));
            }

            var model = JsonSerializer.Deserialize<CanonicalLabelModel>(pi.PrintedPayload, ReadOptions);
            if (model == null) return StatusCode(StatusCodes.Status500InternalServerError, ApiError.Of("stored_label_unreadable", "Stored label could not be read."));

            var pdf = _renderService.GeneratePdf(model, pi.Quantity, null);
            var fileName = $"baski-{Slug(pi.Product?.Sku)}-{pi.Id.ToString()[..8]}.pdf";
            Response.Headers.ContentDisposition = $"inline; filename=\"{fileName}\"";
            return File(pdf, "application/pdf");
        }

        [HttpPost("{id}/confirm-print")]
        [HasPermission(Permissions.PrintIntentsConfirm)]
        public async Task<IActionResult> ConfirmPrint(Guid id)
        {
            var pi = await LoadAsync(id);
            if (pi == null) return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));

            if (pi.Status != PrintIntentStatuses.SentToClient)
            {
                return BadRequest(ApiError.Of("intent_cannot_mark_printed", $"Intent cannot be confirmed because it is in '{pi.Status}' state.", new { status = pi.Status }));
            }

            pi.Status = PrintIntentStatuses.UserPrinted;
            pi.CompletedAt = DateTime.UtcNow;
            pi.CompletedBy = CurrentUser;
            pi.FailureReason = null;
            pi.FailureCategory = null;
            pi.PrintedQuantity = pi.Quantity;

            Audit("PrintIntentUserPrinted", pi,
                $"User printed Product {pi.Product?.Sku} with Template {pi.Template?.Code} V{pi.Version?.VersionNumber}.",
                new { sku = pi.Product?.Sku, templateCode = pi.Template?.Code, version = pi.Version?.VersionNumber, quantity = pi.Quantity });

            await _context.SaveChangesAsync();
            var safetyCheck = await _safetyService.EvaluateIntentSafetyAsync(pi);
            return Ok(new { success = true, data = await DetailAsync(pi, safetyCheck) });
        }

        [HttpPost("{id}/mark-failed")]
        [HasPermission(Permissions.PrintIntentsFail)]
        public async Task<IActionResult> MarkFailed(Guid id, MarkPrintIntentFailedDto dto)
        {
            var category = dto.Category?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(category) || !PrintFailureCategories.All.Contains(category))
            {
                return BadRequest(ApiError.Of("FAILURE_CATEGORY_REQUIRED", "Choose why the print failed."));
            }

            var note = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();
            if (category == PrintFailureCategories.Other && note == null)
            {
                return BadRequest(ApiError.Of("FAILURE_NOTE_REQUIRED", "Describe what went wrong."));
            }

            var pi = await LoadAsync(id);
            if (pi == null) return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));

            if (pi.Status != PrintIntentStatuses.SentToClient)
            {
                return BadRequest(ApiError.Of("intent_cannot_fail", $"Intent cannot be marked failed because it is in '{pi.Status}' state.", new { status = pi.Status }));
            }

            if (dto.PrintedQuantity is < 0 || dto.PrintedQuantity > pi.Quantity)
            {
                return BadRequest(ApiError.Of("printed_quantity_out_of_range", $"Printed quantity must be between 0 and {pi.Quantity}.", new { max = pi.Quantity }));
            }

            pi.Status = PrintIntentStatuses.Failed;
            pi.CompletedAt = DateTime.UtcNow;
            pi.CompletedBy = CurrentUser;
            pi.FailureCategory = category;
            pi.FailureReason = note;
            pi.PrintedQuantity = dto.PrintedQuantity ?? 0;

            Audit("PrintIntentFailed", pi,
                $"Print failed for Product {pi.Product?.Sku} with Template {pi.Template?.Code} V{pi.Version?.VersionNumber}. Category: {category}. Reason: {note}",
                new { sku = pi.Product?.Sku, templateCode = pi.Template?.Code, version = pi.Version?.VersionNumber, category, note, printedQuantity = pi.PrintedQuantity, quantity = pi.Quantity });

            await _context.SaveChangesAsync();
            var safetyCheck = await _safetyService.EvaluateIntentSafetyAsync(pi);
            return Ok(new { success = true, data = await DetailAsync(pi, safetyCheck) });
        }

        /// <summary>Prints the same stored label again. A reason is required; no approval.</summary>
        [HttpPost("{id}/reprint")]
        [HasPermission(Permissions.PrintIntentsReprint)]
        public async Task<IActionResult> Reprint(Guid id, ReprintDto dto)
        {
            if (!IsValidQuantity(dto.Quantity, out var quantityError)) return BadRequest(quantityError);

            var reason = dto.Reason?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(reason) || !ReprintReasons.All.Contains(reason))
            {
                return BadRequest(ApiError.Of("REPRINT_REASON_REQUIRED", "Choose why the labels are printed again."));
            }

            var note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
            if (reason == ReprintReasons.Other && note == null)
            {
                return BadRequest(ApiError.Of("REPRINT_NOTE_REQUIRED", "Describe why the labels are printed again."));
            }

            var original = await LoadAsync(id);
            if (original == null) return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));

            if (original.Status != PrintIntentStatuses.UserPrinted && original.Status != PrintIntentStatuses.Failed)
            {
                return BadRequest(ApiError.Of("reprint_not_allowed", "Only printed or failed requests can be printed again.", new { status = original.Status }));
            }

            if (original.PrintedPayload == null)
            {
                return Conflict(ApiError.Of("NO_PRINTED_PAYLOAD", "This request was printed before labels were stored, so it cannot be reproduced exactly. Create a new print request."));
            }

            if (original.Template?.IsArchived == true || original.Version?.Status == TemplateStatus.Archived)
            {
                return BadRequest(ApiError.Of("template_or_version_archived", "The template or version has been archived."));
            }

            var now = DateTime.UtcNow;
            var reprint = new PrintIntent
            {
                Id = Guid.NewGuid(),
                ProductId = original.ProductId,
                TemplateId = original.TemplateId,
                VersionId = original.VersionId,
                Quantity = dto.Quantity,
                Status = PrintIntentStatuses.ReadyForPrint,
                RequestedBy = CurrentUser,
                CreatedAt = now,
                ReadinessSnapshot = original.ReadinessSnapshot,
                OperatorReviewedAt = now,
                OperatorReviewedBy = CurrentUser,
                SourceVersionStatus = original.Version?.Status,
                PrintedPayload = original.PrintedPayload,
                PayloadSha256 = original.PayloadSha256,
                ReprintOfId = original.Id,
                ReprintReason = reason,
                ReprintNote = note,
                Channel = original.Channel,
                Product = original.Product,
                Template = original.Template,
                Version = original.Version,
            };
            _context.PrintIntents.Add(reprint);

            var parameters = new { originalId = original.Id, reprintId = reprint.Id, reason, note, quantity = reprint.Quantity, sku = original.Product?.Sku };
            Audit("PrintIntentReprinted", reprint, $"Reprint of {original.Id} for Product {original.Product?.Sku}, Qty: {reprint.Quantity}. Reason: {reason}. {note}", parameters);
            Audit("PrintIntentReprinted", original, $"Reprint {reprint.Id} created. Reason: {reason}. Qty: {reprint.Quantity}.", parameters);

            await _context.SaveChangesAsync();
            var safetyCheck = await _safetyService.EvaluateIntentSafetyAsync(reprint);
            return Ok(new { success = true, data = await DetailAsync(reprint, safetyCheck) });
        }

        [HttpPost("{id}/cancel")]
        [HasPermission(Permissions.PrintIntentsCancel)]
        public async Task<IActionResult> CancelIntent(Guid id)
        {
            var pi = await _context.PrintIntents.FindAsync(id);
            if (pi == null) return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));

            if (pi.Status != PrintIntentStatuses.Pending && pi.Status != PrintIntentStatuses.ReadyForPrint)
            {
                return BadRequest(ApiError.Of("intent_cannot_cancel", $"Intent cannot be cancelled from '{pi.Status}' state.", new { status = pi.Status }));
            }

            pi.Status = PrintIntentStatuses.Cancelled;
            Audit("PrintIntentCancelled", pi, "Intent cancelled by operator.");

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpGet("{id}/audit")]
        [HasPermission(Permissions.PrintIntentsView)]
        public async Task<IActionResult> GetIntentAudit(Guid id)
        {
            var piExists = await _context.PrintIntents.AnyAsync(p => p.Id == id);
            if (!piExists) return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));

            var logs = await _context.AuditLogs
                .Where(a => a.EntityId == id.ToString() && a.EntityType == "PrintIntent")
                .OrderBy(a => a.Timestamp)
                .Select(a => new AuditLogDto
                {
                    Id = a.Id,
                    Timestamp = a.Timestamp,
                    Action = a.Action,
                    UserId = a.UserId,
                    Details = a.Details,
                    CorrelationId = a.CorrelationId
                })
                .ToListAsync();

            return Ok(new { success = true, data = logs });
        }

        private Task<PrintIntent?> LoadAsync(Guid id) => _context.PrintIntents
            .Include(p => p.Product).ThenInclude(p => p!.Category)
            .Include(p => p.Product).ThenInclude(p => p!.Vendor)
            .Include(p => p.Template)
            .Include(p => p.Version)
            .FirstOrDefaultAsync(p => p.Id == id);

        private PrintIntent NewIntent(Product product, LabelTemplate template, LabelTemplateVersion version, int quantity, PreviewReadinessDto readiness, string? channel) => new()
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            TemplateId = template.Id,
            VersionId = version.Id,
            Quantity = quantity,
            Status = PrintIntentStatuses.Pending,
            RequestedBy = CurrentUser,
            CreatedAt = DateTime.UtcNow,
            ReadinessSnapshot = JsonSerializer.Serialize(readiness),
            SourceVersionStatus = version.Status,
            Channel = channel,
            Product = product,
            Template = template,
            Version = version,
        };

        /// <summary>Resolves the version layout against the product and stores it. Returns the error response body, or null.</summary>
        private ApiErrorBody? CaptureSnapshot(PrintIntent pi)
        {
            if (pi.Version == null || pi.Product == null)
            {
                return ApiError.Of("intent_context_missing", "Template version or product is missing.");
            }

            var model = JsonSerializer.Deserialize<CanonicalLabelModel>(pi.Version.LayoutJson, ReadOptions);
            if (model == null)
            {
                return ApiError.Of("template_layout_unreadable", "Template layout could not be read.");
            }

            _variableService.ResolveVariables(model, pi.Product);
            var unresolved = model.Elements.Where(element => element.Content?.Contains("{{") == true).Select(element => element.Name ?? element.Id).ToList();
            if (unresolved.Count > 0)
            {
                return ApiError.Of("fields_unresolved", $"Some fields could not be filled from the product: {string.Join(", ", unresolved)}.", new { fields = unresolved });
            }

            pi.PrintedPayload = JsonSerializer.Serialize(model, WriteOptions);
            pi.PayloadSha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(pi.PrintedPayload))).ToLowerInvariant();
            return null;
        }

        private static bool IsValidQuantity(int quantity, out object error)
        {
            error = ApiError.Of("QUANTITY_OUT_OF_RANGE", $"Quantity must be between 1 and {LabelRenderService.MaxCopies}.", new { max = LabelRenderService.MaxCopies });
            return quantity >= 1 && quantity <= LabelRenderService.MaxCopies;
        }

        private void Audit(string action, PrintIntent pi, string details, object? parameters = null) =>
            AuditWriter.Add(_context, action, "PrintIntent", pi.Id, CurrentUser, HttpContext.TraceIdentifier, details, parameters);

        private void AuditCreated(PrintIntent pi) => Audit("PrintIntentCreated", pi,
            $"Intent created for Product {pi.Product?.Sku}, Template {pi.Template?.Code} V{pi.Version?.VersionNumber}, Qty: {pi.Quantity}",
            new { sku = pi.Product?.Sku, templateCode = pi.Template?.Code, version = pi.Version?.VersionNumber, quantity = pi.Quantity, channel = pi.Channel });

        private void AuditDispatched(PrintIntent pi) => Audit("PrintIntentPdfDispatched", pi,
            $"PDF dispatched to browser for Product {pi.Product?.Sku}, Template {pi.Template?.Code} V{pi.Version?.VersionNumber}, Qty: {pi.Quantity}.",
            new { sku = pi.Product?.Sku, templateCode = pi.Template?.Code, version = pi.Version?.VersionNumber, quantity = pi.Quantity, payloadSha256 = pi.PayloadSha256, channel = pi.Channel, reprintOf = pi.ReprintOfId });

        private static string Slug(string? value) =>
            string.IsNullOrWhiteSpace(value) ? "etiket" : new string(value.Where(ch => char.IsLetterOrDigit(ch) || ch == '-').ToArray());

        private async Task<PrintIntentDetailDto> DetailAsync(PrintIntent pi, FinalSafetyCheckResult? safetyCheck)
        {
            var reprints = await _context.PrintIntents.AsNoTracking()
                .Where(other => other.ReprintOfId == pi.Id)
                .OrderByDescending(other => other.CreatedAt)
                .Select(other => new PrintIntentReprintDto
                {
                    Id = other.Id,
                    Quantity = other.Quantity,
                    Status = other.Status,
                    ReprintReason = other.ReprintReason,
                    RequestedBy = other.RequestedBy,
                    CreatedAt = other.CreatedAt,
                })
                .ToListAsync();

            return new PrintIntentDetailDto
            {
                Id = pi.Id,
                ProductId = pi.ProductId,
                ProductName = pi.Product?.Name ?? string.Empty,
                ProductSku = pi.Product?.Sku ?? string.Empty,
                TemplateId = pi.TemplateId,
                TemplateName = pi.Template?.Name ?? string.Empty,
                TemplateCode = pi.Template?.Code ?? string.Empty,
                VersionId = pi.VersionId,
                VersionNumber = pi.Version?.VersionNumber ?? 0,
                Quantity = pi.Quantity,
                Status = pi.Status,
                RequestedBy = pi.RequestedBy,
                CreatedAt = pi.CreatedAt,
                ReadinessSnapshot = pi.ReadinessSnapshot,
                OperatorReviewedAt = pi.OperatorReviewedAt,
                OperatorReviewedBy = pi.OperatorReviewedBy,
                DispatchedAt = pi.DispatchedAt,
                DispatchedBy = pi.DispatchedBy,
                CompletedAt = pi.CompletedAt,
                CompletedBy = pi.CompletedBy,
                FailureReason = pi.FailureReason,
                SourceVersionStatus = pi.SourceVersionStatus,
                HasPrintedPayload = pi.PrintedPayload != null,
                ReprintOfId = pi.ReprintOfId,
                ReprintReason = pi.ReprintReason,
                ReprintNote = pi.ReprintNote,
                FailureCategory = pi.FailureCategory,
                PrintedQuantity = pi.PrintedQuantity,
                Channel = pi.Channel,
                SafetyCheck = safetyCheck,
                Reprints = reprints,
            };
        }
    }
}
