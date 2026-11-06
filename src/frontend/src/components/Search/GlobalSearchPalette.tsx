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
    <div className="fixed inset-0 z-[60] bg-ink/30" onClick={onClose}>
      <div className="mx-auto mt-[10vh] w-[min(880px,92vw)] overflow-hidden rounded-xl border border-line-strong" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-raised text-accent">
            <MagnifyingGlass size={18} weight="bold" />
          </div>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:text-ink-3"
            placeholder={t("search.placeholder")}
          />
          <button className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink-3" onClick={onClose}>{t("common.close")}</button>
        </div>
        <div className="flex items-center justify-between border-b border-line px-5 py-3 text-xs font-medium text-ink-3">
          <span>{loading ? t("search.searching") : t("search.results", undefined, { count: resultCount })}</span>
          <span>{t("search.shortcut")}</span>
        </div>
        <div className="custom-scrollbar max-h-[62vh] overflow-y-auto p-5">
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="text-xs font-medium text-ink-3">{group.label}</div>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <Link key={`${group.key}-${item.id}`} href={item.href} onClick={onClose} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-raised px-4 py-3 transition-colors hover:bg-raised">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-ink">{item.label}</div>
                        {item.description ? <div className="mt-1 truncate text-xs text-ink-3">{item.description}</div> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.badge ? <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-1 text-xs font-medium text-accent">{item.badge}</span> : null}
                        <span className="text-xs font-medium text-ink-3">{item.type}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            {!loading && resultCount === 0 ? (
              <div className="rounded-lg border border-dashed border-line px-4 py-12 text-center text-sm text-ink-3">
                {t("search.noResults")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
