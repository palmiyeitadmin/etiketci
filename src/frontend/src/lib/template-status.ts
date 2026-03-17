import { LabelTemplate, TemplateStatus, TemplateVersion } from "@/types/template";

const templateStatusByNumber: Record<number, TemplateStatus> = {
  0: "Draft",
  1: "InReview",
  2: "Approved",
  3: "Rejected",
  4: "Published",
  5: "Deprecated",
  6: "Archived",
};

function isTemplateStatus(value: string): value is TemplateStatus {
  return Object.values(templateStatusByNumber).includes(value as TemplateStatus);
}

export function normalizeTemplateStatus(status: unknown): TemplateStatus {
  if (typeof status === "number") {
    return templateStatusByNumber[status] ?? "Archived";
  }

  if (typeof status === "string") {
    if (isTemplateStatus(status)) {
      return status;
    }

    const numericValue = Number.parseInt(status, 10);
    if (!Number.isNaN(numericValue)) {
      return templateStatusByNumber[numericValue] ?? "Archived";
    }
  }

  return "Archived";
}

export function normalizeTemplateVersion(version: TemplateVersion): TemplateVersion {
  return {
    ...version,
    status: normalizeTemplateStatus(version.status),
  };
}

export function normalizeLabelTemplate(template: LabelTemplate): LabelTemplate {
  return {
    ...template,
    currentActiveVersion: template.currentActiveVersion
      ? normalizeTemplateVersion(template.currentActiveVersion)
      : undefined,
    latestVersion: template.latestVersion
      ? normalizeTemplateVersion(template.latestVersion)
      : undefined,
    versions: template.versions?.map(normalizeTemplateVersion),
  };
}
