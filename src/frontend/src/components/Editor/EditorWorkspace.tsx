"use client";

import { EditorShell } from "@/components/Editor/EditorShell";
import { EditorSaveResult } from "@/components/Editor/editor-save";
import { CanonicalLabelModel } from "@/types/canvas";

interface EditorWorkspaceProps {
  initialModel: CanonicalLabelModel;
  onSave: (model: CanonicalLabelModel) => Promise<EditorSaveResult>;
  previewHref?: string;
  onRenameTemplate?: (name: string, model: CanonicalLabelModel) => Promise<void>;
}

export function EditorWorkspace({ initialModel, onSave, previewHref, onRenameTemplate }: EditorWorkspaceProps) {
  return <EditorShell initialModel={initialModel} onSave={onSave} previewHref={previewHref} onRenameTemplate={onRenameTemplate} />;
}
