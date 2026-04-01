"use client";

import { useEditorStore } from "@/components/Editor/useEditorStore";
import { ClockCounterClockwise, ArrowCounterClockwise, ArrowClockwise } from "@phosphor-icons/react";

export function EditorHistoryPanel() {
  const history = useEditorStore((state) => state.history);
  const currentModel = useEditorStore((state) => state.model);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const restoreHistoryState = useEditorStore((state) => state.restoreHistoryState);

  const historyItems = [
    ...history.past.map((model, i) => ({ model, type: "past", index: i })),
    { model: currentModel, type: "current", index: history.past.length },
    ...history.future.map((model, i) => ({ model, type: "future", index: i })),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[color:var(--plms-border)] p-4 bg-[color:var(--plms-panel-2)]">
        <div className="flex items-center gap-2">
            <ClockCounterClockwise size={18} weight="bold" className="text-blue-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">Gecmis</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={history.past.length === 0}
            className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-20"
            title="Undo (Ctrl+Z)"
          >
            <ArrowCounterClockwise size={18} />
          </button>
          <button
            onClick={redo}
            disabled={history.future.length === 0}
            className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-20"
            title="Redo (Ctrl+Y)"
          >
            <ArrowClockwise size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-1">
          {historyItems.reverse().map((item, i) => {
            const isCurrent = item.type === "current";
            const isFuture = item.type === "future";
            
            return (
              <div
                key={`${item.type}-${item.index}`}
                onClick={() => !isCurrent && restoreHistoryState(item.type as any, item.index)}
                className={`group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                  isCurrent
                    ? "bg-blue-600 shadow-lg shadow-blue-900/20 text-white ring-1 ring-blue-400/50"
                    : isFuture
                    ? "text-slate-500 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-white/5"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${isCurrent ? "bg-white animate-pulse" : isFuture ? "bg-slate-700" : "bg-blue-400/50"}`} />
                <div className="flex-1 truncate">
                  {isCurrent ? "Su anki durum" : `Islem #${item.index + 1}`}
                </div>
                {isCurrent && <span className="text-[10px] font-black uppercase opacity-60 tracking-wider">Aktif</span>}
              </div>
            );
          })}
          
          {historyItems.length === 1 && (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-500">
                <ClockCounterClockwise size={20} />
              </div>
              <p className="text-xs text-slate-500">Henuz bir islem gecmisi yok.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="border-t border-[color:var(--plms-border)] p-4 bg-[color:var(--plms-panel)]">
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-wider">
           Son 50 islem saklanir. Herhangi bir duruma donmek icin Ctrl+Z / Ctrl+Y kullanabilirsiniz.
        </p>
      </div>
    </div>
  );
}
