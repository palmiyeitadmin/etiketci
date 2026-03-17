"use client";

import { useMemo, useState } from "react";
import { searchPhosphorIcons, phosphorIconCatalog, type PhosphorIconKey } from "@/lib/phosphor-icon-catalog";

export function PhosphorIconPicker({
  onInsert,
}: {
  onInsert: (payload: { key: PhosphorIconKey; content: string; name: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const icons = useMemo(() => searchPhosphorIcons(query), [query]);

  return (
    <div className="space-y-4">
      <input
        className="plms-input"
        placeholder={`Search ${phosphorIconCatalog.length} Phosphor icons`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {icons.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onInsert({ key: item.key, content: "", name: item.label })}
            className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 text-left transition-colors hover:bg-white/[0.05]"
          >
            <div className="flex h-16 items-center justify-center rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.03] text-white">
              <item.Icon size={28} weight="regular" />
            </div>
            <div className="mt-3 truncate text-sm font-bold text-white">{item.label}</div>
            <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{item.key}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
