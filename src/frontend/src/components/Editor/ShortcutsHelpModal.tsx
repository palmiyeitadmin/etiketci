"use client";

import { useMemo } from "react";
import { X, Keyboard, Mouse, ArrowRight, Command, Sidebar, TextT, Selection, SelectionPlus, CornersIn, Trash, Copy, Scissors, PlusSquare, ListNumbers } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "motion/react";

interface ShortcutItemProps {
  keys: string[];
  label: string;
}

function ShortcutItem({ keys, label }: ShortcutItemProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <span className="text-sm font-medium text-[color:var(--plms-text-muted)]">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i} className="min-w-[24px] rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-center font-mono text-[10px] font-bold text-white shadow-sm">
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  const { locale } = useI18n();

  const text = locale === "tr"
    ? {
        title: "Klavye Kısayolları",
        description: "Editörü daha hızlı kullanmak için kısayolları öğrenin.",
        sections: {
          common: "Temel İşlemler",
          selection: "Seçim & Görünüm",
          edit: "Hizalama & Düzen",
        },
        items: {
          save: "Kaydet",
          undo: "Geri Al",
          redo: "İleri Al",
          copy: "Kopyala",
          paste: "Yapıştır",
          cut: "Kes",
          duplicate: "Çoğalt",
          delete: "Sil",
          group: "Grupla",
          ungroup: "Grubu Çöz",
          fitSelection: "Seçimi Ekrana Sığdır",
          zoom: "Zoom (Scroll)",
          pan: "Kaydır (Space + Sürükle)",
          nudge: "Hassas Hareket",
          fastNudge: "Hızlı Hareket",
          selectMultiple: "Çoklu Seçim",
          deselect: "Seçimi Kaldır",
          help: "Yardım Panelini Aç/Kapat"
        }
      }
    : {
        title: "Keyboard Shortcuts",
        description: "Master the editor with professional shortcuts.",
        sections: {
          common: "Common Actions",
          selection: "Selection & View",
          edit: "Layout & Arrangement",
        },
        items: {
          save: "Save",
          undo: "Undo",
          redo: "Redo",
          copy: "Copy",
          paste: "Paste",
          cut: "Cut",
          duplicate: "Duplicate",
          delete: "Delete",
          group: "Group",
          ungroup: "Ungroup",
          fitSelection: "Fit Selection to Screen",
          zoom: "Zoom (Scroll)",
          pan: "Pan (Space + Drag)",
          nudge: "Nudge",
          fastNudge: "Fast Nudge",
          selectMultiple: "Multi Select",
          deselect: "Deselect",
          help: "Toggle Help Panel"
        }
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[color:var(--plms-panel)] shadow-2xl"
          >
            <div className="flex h-full max-h-[85vh] flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-8 py-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                    <Keyboard size={24} weight="bold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white">{text.title}</h2>
                    <p className="text-xs font-semibold text-[color:var(--plms-text-subtle)] uppercase tracking-wider">{text.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="group flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 transition-colors hover:bg-white/5"
                >
                  <X className="text-[color:var(--plms-text-subtle)] transition-colors group-hover:text-white" size={20} weight="bold" />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-8 pt-6">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                        <Command weight="bold" size={14} />
                        {text.sections.common}
                      </h3>
                      <div className="space-y-1">
                        <ShortcutItem label={text.items.save} keys={["Ctrl", "S"]} />
                        <ShortcutItem label={text.items.undo} keys={["Ctrl", "Z"]} />
                        <ShortcutItem label={text.items.redo} keys={["Ctrl", "Shift", "Z"]} />
                        <ShortcutItem label={text.items.copy} keys={["Ctrl", "C"]} />
                        <ShortcutItem label={text.items.paste} keys={["Ctrl", "V"]} />
                        <ShortcutItem label={text.items.cut} keys={["Ctrl", "X"]} />
                        <ShortcutItem label={text.items.help} keys={["?"]} />
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
                        <Selection weight="bold" size={14} />
                        {text.sections.selection}
                      </h3>
                      <div className="space-y-2 text-[color:var(--plms-text-muted)]">
                        <ShortcutItem label={text.items.fitSelection} keys={["Ctrl", "1"]} />
                        <ShortcutItem label={text.items.zoom} keys={["Ctrl", "Scroll"]} />
                        <ShortcutItem label={text.items.pan} keys={["Space", "Drag"]} />
                        <ShortcutItem label={text.items.selectMultiple} keys={["Shift", "Click"]} />
                        <ShortcutItem label={text.items.deselect} keys={["Esc"]} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
                        <Sidebar weight="bold" size={14} />
                        {text.sections.edit}
                      </h3>
                      <div className="space-y-1">
                        <ShortcutItem label={text.items.duplicate} keys={["Ctrl", "D"]} />
                        <ShortcutItem label={text.items.delete} keys={["Delete"]} />
                        <ShortcutItem label={text.items.group} keys={["Ctrl", "G"]} />
                        <ShortcutItem label={text.items.ungroup} keys={["Ctrl", "Shift", "G"]} />
                        <ShortcutItem label={text.items.nudge} keys={["Arrow Keys"]} />
                        <ShortcutItem label={text.items.fastNudge} keys={["Shift", "Arrows"]} />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/5 bg-white/5 p-5">
                      <div className="flex items-center gap-3 text-white">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/20 text-green-400">
                          <SelectionPlus size={18} weight="bold" />
                        </div>
                        <span className="text-sm font-bold">{locale === "tr" ? "Akıllı Kılavuzlar Aktif" : "Smart Guides Active"}</span>
                      </div>
                      <p className="mt-2 text-xs font-medium leading-relaxed text-[color:var(--plms-text-subtle)]">
                        {locale === "tr" 
                          ? "Elementleri birbirine veya kenarlara yaklaştırarak otomatik hizalayın. Turuncu kutucuklar mesafeleri milimetre cinsinden gösterir." 
                          : "Align elements automatically to edges or center. Orange boxes display dimensions and distances in millimeters."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 border-t border-white/5 bg-white/5 px-8 py-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[color:var(--plms-text-subtle)]">
                  <CornersIn size={12} weight="bold" />
                  <span>Etiketci Editor v2.0 • Premium UX</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
