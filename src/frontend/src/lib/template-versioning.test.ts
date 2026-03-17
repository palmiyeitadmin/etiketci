import { ensureEditableVersion, findTemplateVersion, resolveEditorDraftVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";

const mockApiFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

function createVersion(overrides: Partial<TemplateVersion>): TemplateVersion {
  return {
    id: overrides.id || crypto.randomUUID(),
    versionNumber: overrides.versionNumber ?? 1,
    status: overrides.status ?? "Draft",
    layoutJson: overrides.layoutJson ?? "{}",
    changeNotes: overrides.changeNotes,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    createdBy: overrides.createdBy ?? "tester",
    sourceVersionId: overrides.sourceVersionId,
    submittedForReviewAt: overrides.submittedForReviewAt,
    submittedForReviewBy: overrides.submittedForReviewBy,
    reviewedAt: overrides.reviewedAt,
    reviewedBy: overrides.reviewedBy,
    reviewDecision: overrides.reviewDecision,
    reviewComment: overrides.reviewComment,
    publishedAt: overrides.publishedAt,
    publishedBy: overrides.publishedBy,
  };
}

function createTemplate(versions: TemplateVersion[]): LabelTemplate {
  return {
    id: "template-1",
    name: "Template",
    code: "TPL-001",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentActiveVersion: versions.find((version) => version.status === "Published"),
    latestVersion: versions.slice().sort((left, right) => right.versionNumber - left.versionNumber)[0],
    versions,
  };
}

describe("template versioning", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("finds a template version by id", () => {
    const draft = createVersion({ id: "draft-1", status: "Draft", versionNumber: 2 });
    const template = createTemplate([draft]);

    expect(findTemplateVersion(template, "draft-1")).toEqual(draft);
    expect(findTemplateVersion(template, "missing")).toBeUndefined();
  });

  it("returns the exact requested draft version for editor resolution", async () => {
    const published = createVersion({ id: "published-1", status: "Published", versionNumber: 1 });
    const draft = createVersion({ id: "draft-2", status: "Draft", versionNumber: 2, sourceVersionId: published.id });
    const template = createTemplate([published, draft]);

    const resolved = await resolveEditorDraftVersion(template, draft.id);

    expect(resolved).toEqual(draft);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("reuses an existing derived draft for a selected non-draft version", async () => {
    const published = createVersion({ id: "published-1", status: "Published", versionNumber: 1 });
    const rejected = createVersion({ id: "rejected-2", status: "Rejected", versionNumber: 2 });
    const draft = createVersion({ id: "draft-3", status: "Draft", versionNumber: 3, sourceVersionId: rejected.id });
    const template = createTemplate([published, rejected, draft]);

    const resolved = await resolveEditorDraftVersion(template, rejected.id);

    expect(resolved).toEqual(draft);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("creates a new revision when no suitable draft exists", async () => {
    const published = createVersion({ id: "published-1", status: "Published", versionNumber: 1, layoutJson: "{\"name\":\"published\"}" });
    const template = createTemplate([published]);

    mockApiFetch.mockResolvedValue({
      success: true,
      data: { id: "draft-2", versionNumber: 2 },
    });

    const resolved = await ensureEditableVersion(template, published);

    expect(mockApiFetch).toHaveBeenCalledWith("/api/Templates/template-1/revisions?fromVersionId=published-1", { method: "POST" });
    expect(resolved).toMatchObject({
      id: "draft-2",
      versionNumber: 2,
      status: "Draft",
      layoutJson: "{\"name\":\"published\"}",
    });
  });

  it("throws for an unknown requested editor version", async () => {
    const published = createVersion({ id: "published-1", status: "Published", versionNumber: 1 });
    const template = createTemplate([published]);

    await expect(resolveEditorDraftVersion(template, "unknown-version")).rejects.toThrow("Requested template version could not be found.");
  });
});
