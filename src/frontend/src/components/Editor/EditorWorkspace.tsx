"use client";

import { EditorShell } from "@/components/Editor/EditorShell";
import { EditorWorkspace as LegacyEditorWorkspace } from "@/components/Editor/legacy/LegacyEditorWorkspace";
import { EditorSaveResult } from "@/components/Editor/editor-save";
import { CanonicalLabelModel } from "@/types/canvas";

interface EditorWorkspaceProps {
  initialModel: CanonicalLabelModel;
  onSave: (model: CanonicalLabelModel) => Promise<EditorSaveResult>;
  previewHref?: string;
  onRenameTemplate?: (name: string, model: CanonicalLabelModel) => Promise<void>;
}

const editorEngine = process.env.NEXT_PUBLIC_EDITOR_ENGINE ?? "konva";

export function EditorWorkspace({ initialModel, onSave, previewHref, onRenameTemplate }: EditorWorkspaceProps) {
  if (editorEngine === "legacy") {
    return <LegacyEditorWorkspace initialModel={initialModel} onSave={onSave} previewHref={previewHref} />;
  }

  return <EditorShell initialModel={initialModel} onSave={onSave} previewHref={previewHref} onRenameTemplate={onRenameTemplate} />;
}
