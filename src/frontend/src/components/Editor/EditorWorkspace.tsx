"use client";

import { EditorShell } from "@/components/Editor/EditorShell";
import { EditorWorkspace as LegacyEditorWorkspace } from "@/components/Editor/LegacyEditorWorkspace";
import { EditorSaveResult } from "@/components/Editor/editor-save";
import { CanonicalLabelModel } from "@/types/canvas";

interface EditorWorkspaceProps {
  initialModel: CanonicalLabelModel;
  onSave: (model: CanonicalLabelModel) => Promise<EditorSaveResult>;
  previewHref?: string;
}

const editorEngine = process.env.NEXT_PUBLIC_EDITOR_ENGINE ?? "konva";

export function EditorWorkspace({ initialModel, onSave, previewHref }: EditorWorkspaceProps) {
  if (editorEngine === "legacy") {
    return <LegacyEditorWorkspace initialModel={initialModel} onSave={onSave} previewHref={previewHref} />;
  }

  return <EditorShell initialModel={initialModel} onSave={onSave} previewHref={previewHref} />;
}
