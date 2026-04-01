"use client";

import { QUICK_TEMPLATES, QuickTemplate } from "@/components/Editor/templates-data";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { LabelElement } from "@/types/canvas";
import { createDefaultElement } from "@/lib/editor-canonical";
import { Layout, Plus } from "@phosphor-icons/react";

export function TemplatesLibraryDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const addTemplate = useEditorStore((state) => state.addTemplate);

  const text = locale === "tr"
    ? {
      title: "Hizli Sablonlar",
      heading: "Hazir Bilesenler",
      description: "Sik kullanilan etiket bilesenlerini tek tıkla tuvale ekleyin.",
      close: "Kapat",
      add: "Ekle",
    }
    : {
      title: "Quick Templates",
      heading: "Ready Components",
      description: "Add frequently used label components to the canvas with one click.",
      close: "Close",
      add: "Add",
    };

  if (!open) return null;

  const handleAdd = (template: QuickTemplate) => {
    const elements = template.elements.map((parts, index) => {
      const base = createDefaultElement(parts.type || "text", index);
      return {
        ...base,
        ...parts,
        id: `tpl-${template.id}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      } as LabelElement;
    });
    addTemplate(elements);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[55] bg-slate-950/75 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col border-r border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] shadow-[0_24px_80px_rgba(2,6,23,0.5)]" 
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[color:var(--plms-border)] px-6 py-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.title}</div>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">{text.heading}</h2>
            <p className="mt-2 text-sm text-[color:var(--plms-text-subtle)]">{text.description}</p>
          </div>
          <button className="plms-button-secondary" onClick={onClose}>{text.close}</button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {QUICK_TEMPLATES.map((template) => (
            <div 
              key={template.id} 
              className="group relative rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5 transition-all hover:border-blue-500/50 hover:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Layout size={20} />
                </div>
                <button 
                  onClick={() => handleAdd(template)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white hover:bg-blue-600 transition-colors"
                  title={text.add}
                >
                  <Plus size={18} />
                </button>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-bold text-white leading-tight">{template.name}</h3>
                <p className="mt-1 text-sm text-[color:var(--plms-text-subtle)]">{template.description}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {template.elements.map((el, i) => (
                  <span key={i} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-[color:var(--plms-text-subtle)] uppercase tracking-wider border border-white/5">
                    {el.type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
