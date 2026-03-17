import { apiFetch } from "@/lib/api-client";
import { LabelTemplate, TemplateVersion } from "@/types/template";

function getRevisionSourceVersion(template: LabelTemplate, preferredVersion?: TemplateVersion): TemplateVersion | undefined {
  return (
    preferredVersion ||
    template.currentActiveVersion ||
    template.versions?.find((version) => version.status === "Published" || version.status === "Approved") ||
    template.versions?.[0]
  );
}

function getLatestDraftVersion(template: LabelTemplate): TemplateVersion | undefined {
  return (template.versions || [])
    .filter((version) => version.status === "Draft")
    .sort((left, right) => right.versionNumber - left.versionNumber)[0];
}

function getLatestDerivedDraft(template: LabelTemplate, sourceVersionId: string): TemplateVersion | undefined {
  return (template.versions || [])
    .filter((version) => version.status === "Draft" && version.sourceVersionId === sourceVersionId)
    .sort((left, right) => right.versionNumber - left.versionNumber)[0];
}

export function findTemplateVersion(template: LabelTemplate, versionId?: string | null): TemplateVersion | undefined {
  if (!versionId) {
    return undefined;
  }

  return template.versions?.find((version) => version.id === versionId)
    || (template.currentActiveVersion?.id === versionId ? template.currentActiveVersion : undefined)
    || (template.latestVersion?.id === versionId ? template.latestVersion : undefined);
}

export async function ensureEditableVersion(template: LabelTemplate, preferredVersion?: TemplateVersion): Promise<TemplateVersion> {
  if (preferredVersion?.status === "Draft") {
    return preferredVersion;
  }

  if (!preferredVersion) {
    const existingDraft = getLatestDraftVersion(template);
    if (existingDraft) {
      return existingDraft;
    }
  }

  const sourceVersion = getRevisionSourceVersion(template, preferredVersion);
  if (!sourceVersion) {
    throw new Error("No source version available to create a new draft.");
  }

  if (sourceVersion.status === "Draft") {
    return sourceVersion;
  }

  const existingDraft = getLatestDerivedDraft(template, sourceVersion.id);
  if (existingDraft) {
    return existingDraft;
  }

  const revisionResponse = await apiFetch<{ id: string; versionNumber: number }>(
    `/api/Templates/${template.id}/revisions?fromVersionId=${sourceVersion.id}`,
    { method: "POST" }
  );

  if (!revisionResponse.success || !revisionResponse.data) {
    throw new Error(revisionResponse.success ? "Revision creation returned no data." : revisionResponse.error.message);
  }

  return {
    id: revisionResponse.data.id,
    versionNumber: revisionResponse.data.versionNumber,
    status: "Draft",
    layoutJson: sourceVersion.layoutJson,
    changeNotes: `Revision based on V${sourceVersion.versionNumber}`,
    createdAt: new Date().toISOString(),
    createdBy: "Current User",
  };
}

export async function resolveEditorDraftVersion(template: LabelTemplate, requestedVersionId?: string | null): Promise<TemplateVersion> {
  if (!requestedVersionId) {
    return ensureEditableVersion(template);
  }

  const requestedVersion = findTemplateVersion(template, requestedVersionId);
  if (!requestedVersion) {
    throw new Error("Requested template version could not be found.");
  }

  if (requestedVersion.status === "Draft") {
    return requestedVersion;
  }

  return ensureEditableVersion(template, requestedVersion);
}
