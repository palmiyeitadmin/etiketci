"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaretDown, CaretUp, MagnifyingGlass } from "@phosphor-icons/react";
import { getFeaturedPhosphorIcons, searchPhosphorIcons, type PhosphorIconCatalogItem, type PhosphorIconKey } from "@/lib/phosphor-icon-catalog";
import { PhosphorIconPreview } from "@/components/Editor/PhosphorIconPreview";
import { useI18n, useText } from "@/lib/i18n";
import { turkishIconName } from "@/lib/phosphor-icon-names-tr";

const PAGE_SIZE = 96;

export function PhosphorIconPicker({
  onInsert,
}: {
  onInsert: (payload: { key: PhosphorIconKey; content: string; name: string }) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [insertingKey, setInsertingKey] = useState<PhosphorIconKey | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const featuredIcons = useMemo(() => getFeaturedPhosphorIcons(), []);
  const shouldShowFullCatalog = showAll || query.trim().length > 0;
  const { locale } = useI18n();
  const isTurkish = locale === "tr";
  const allResults = useMemo(() => searchPhosphorIcons(query, { turkishNames: isTurkish }), [query, isTurkish]);
  const labelOf = useCallback(
    (item: PhosphorIconCatalogItem) => (isTurkish ? turkishIconName(item.key) : item.label),
    [isTurkish]
  );
  const visibleIcons = useMemo(
    () => (shouldShowFullCatalog ? allResults.slice(0, visibleCount) : featuredIcons),
    [allResults, featuredIcons, shouldShowFullCatalog, visibleCount]
  );
  const canLoadMore = shouldShowFullCatalog && allResults.length > visibleCount;
  const text = useText("editor").iconPicker;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, showAll]);

  async function handleInsert(item: PhosphorIconCatalogItem) {
    try {
      setPickerError(null);
      setInsertingKey(item.key);
      await onInsert({ key: item.key, content: "", name: labelOf(item) });
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : text.insertFailed);
    } finally {
      setInsertingKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          className="plms-input pl-9"
          aria-label={text.placeholder}
          placeholder={text.placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {pickerError ? (
        <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
          {pickerError}
        </div>
      ) : null}

      {!query.trim() ? (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium text-ink">{text.featured}</h3>
            <span className="font-mono text-xs tabular text-ink-3">{featuredIcons.length} {text.icons}</span>
          </div>
          <IconGrid items={featuredIcons} labelOf={labelOf} onInsert={handleInsert} insertingKey={insertingKey} />
        </section>
      ) : null}

      <section className="space-y-2">
        {!query.trim() ? (
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              <h3 className="text-sm font-medium text-ink">{text.fullCatalog}</h3>
              <p className="text-xs text-ink-3">{text.fullCatalogDescription}</p>
            </div>
            <button
              type="button"
              className="plms-button-compact"
              aria-expanded={showAll}
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? <CaretUp size={16} /> : <CaretDown size={16} />}
              <span>{showAll ? text.showLess : text.showAll}</span>
            </button>
          </div>
        ) : (
          <div className="font-mono text-xs tabular text-ink-3">{allResults.length} {text.results}</div>
        )}

        {shouldShowFullCatalog ? (
          visibleIcons.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-3">
              {text.empty}
            </div>
          ) : (
            <div className="space-y-3">
              <IconGrid items={visibleIcons} labelOf={labelOf} onInsert={handleInsert} insertingKey={insertingKey} />
              {canLoadMore ? (
                <div className="flex justify-center">
                  <button type="button" className="plms-button-compact" onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}>
                    {text.loadMore}
                  </button>
                </div>
              ) : null}
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}

function IconGrid({
  items,
  labelOf,
  onInsert,
  insertingKey,
}: {
  items: readonly PhosphorIconCatalogItem[];
  labelOf: (item: PhosphorIconCatalogItem) => string;
  onInsert: (item: PhosphorIconCatalogItem) => Promise<void>;
  insertingKey: PhosphorIconKey | null;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
      {items.map((item) => {
        const label = labelOf(item);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => void onInsert(item)}
            title={`${label} · ${item.key}`}
            aria-label={label}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-transparent px-1 pb-2 pt-3 text-ink-2 transition-colors hover:border-line hover:bg-raised hover:text-ink disabled:cursor-wait disabled:opacity-60"
            disabled={insertingKey === item.key}
          >
            <PhosphorIconPreview iconKey={item.key} size={24} />
            <span className="w-full truncate text-center text-xs">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
