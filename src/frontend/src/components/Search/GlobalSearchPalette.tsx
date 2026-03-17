"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { searchEverywhere } from "@/lib/search";
import { useI18n } from "@/lib/i18n";
import { SearchGroup } from "@/types/search";

export function GlobalSearchPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      const response = await searchEverywhere(query, 6);
      if (response.success) {
        setGroups(response.data.groups);
      }
      setLoading(false);
    }, query.trim() ? 180 : 0);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!open) {
          return;
        }
      }

      if (event.key === "Escape" && open) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const resultCount = useMemo(() => groups.reduce((sum, group) => sum + group.items.length, 0), [groups]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto mt-[10vh] w-[min(880px,92vw)] overflow-hidden rounded-[2rem] border border-[color:var(--plms-border-strong)] bg-[linear-gradient(180deg,rgba(16,27,45,0.98),rgba(8,17,31,0.98))] shadow-[0_24px_100px_rgba(2,6,23,0.6)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[color:var(--plms-border)] px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.03] text-blue-200">
            <MagnifyingGlass size={18} weight="bold" />
          </div>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-base font-semibold text-white outline-none placeholder:text-[color:var(--plms-text-subtle)]"
            placeholder={t("search.placeholder")}
          />
          <button className="rounded-2xl border border-[color:var(--plms-border)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]" onClick={onClose}>{t("common.close")}</button>
        </div>
        <div className="flex items-center justify-between border-b border-[color:var(--plms-border)] px-5 py-3 text-[11px] font-medium text-[color:var(--plms-text-subtle)]">
          <span>{loading ? t("search.searching") : t("search.results", undefined, { count: resultCount })}</span>
          <span>{t("search.shortcut")}</span>
        </div>
        <div className="custom-scrollbar max-h-[62vh] overflow-y-auto p-5">
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{group.label}</div>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <Link key={`${group.key}-${item.id}`} href={item.href} onClick={onClose} className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.05]">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{item.label}</div>
                        {item.description ? <div className="mt-1 truncate text-xs text-[color:var(--plms-text-subtle)]">{item.description}</div> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.badge ? <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-blue-200">{item.badge}</span> : null}
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{item.type}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            {!loading && resultCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-12 text-center text-sm text-[color:var(--plms-text-subtle)]">
                {t("search.noResults")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
