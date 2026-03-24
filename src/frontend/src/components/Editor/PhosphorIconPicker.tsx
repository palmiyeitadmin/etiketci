"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { getFeaturedPhosphorIcons, searchPhosphorIcons, type PhosphorIconCatalogItem, type PhosphorIconKey } from "@/lib/phosphor-icon-catalog";
import { PhosphorIconPreview } from "@/components/Editor/PhosphorIconPreview";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 96;

export function PhosphorIconPicker({
  onInsert,
}: {
  onInsert: (payload: { key: PhosphorIconKey; content: string; name: string }) => void | Promise<void>;
}) {
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [insertingKey, setInsertingKey] = useState<PhosphorIconKey | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const featuredIcons = useMemo(() => getFeaturedPhosphorIcons(), []);
  const shouldShowFullCatalog = showAll || query.trim().length > 0;
  const allResults = useMemo(() => searchPhosphorIcons(query), [query]);
  const visibleIcons = useMemo(
    () => (shouldShowFullCatalog ? allResults.slice(0, visibleCount) : featuredIcons),
    [allResults, featuredIcons, shouldShowFullCatalog, visibleCount]
  );
  const canLoadMore = shouldShowFullCatalog && allResults.length > visibleCount;
  const text = locale === "tr"
    ? {
        placeholder: "Phosphor ikon ara",
        featured: "Sik Kullanilanlar",
        featuredDescription: "Hizli ekleme icin secili Phosphor ikonlari.",
        icons: "ikon",
        fullCatalog: "Tum Katalog",
        fullCatalogDescription: "Tum Phosphor ikonlarini arayip gorsel olarak ekleyin.",
        showAll: "Tumunu Goster",
        showLess: "Daha Az Goster",
        empty: "Sonuc bulunamadi.",
        insertFailed: "Phosphor ikon eklenemedi.",
        loadMore: "Daha Fazla Yukle",
      }
    : {
        placeholder: "Search Phosphor icons",
        featured: "Featured",
        featuredDescription: "Quick access to the most useful Phosphor icons.",
        icons: "icons",
        fullCatalog: "Full catalog",
        fullCatalogDescription: "Search the complete Phosphor set and insert any icon as an image.",
        showAll: "Show All",
        showLess: "Show Less",
        empty: "No results found.",
        insertFailed: "Phosphor icon could not be inserted.",
        loadMore: "Load More",
      };

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, showAll]);

  async function handleInsert(item: PhosphorIconCatalogItem) {
    try {
      setPickerError(null);
      setInsertingKey(item.key);
      await onInsert({ key: item.key, content: "", name: item.label });
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : text.insertFailed);
    } finally {
      setInsertingKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <input
        className="plms-input"
        placeholder={text.placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {pickerError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {pickerError}
        </div>
      ) : null}

      {!query.trim() ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--plms-text-subtle)]">{text.featured}</div>
              <p className="mt-1 text-sm text-[color:var(--plms-text-subtle)]">{text.featuredDescription}</p>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{featuredIcons.length} {text.icons}</div>
          </div>
          <IconGrid items={featuredIcons} onInsert={handleInsert} insertingKey={insertingKey} />
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--plms-text-subtle)]">{text.fullCatalog}</div>
            <p className="mt-1 text-sm text-[color:var(--plms-text-subtle)]">{text.fullCatalogDescription}</p>
          </div>
          <button
            type="button"
            className="plms-button-compact"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
            <span>{showAll ? text.showLess : text.showAll}</span>
          </button>
        </div>

        {shouldShowFullCatalog ? (
          visibleIcons.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-6 text-sm text-[color:var(--plms-text-subtle)]">
              {text.empty}
            </div>
          ) : (
            <div className="space-y-3">
              <IconGrid items={visibleIcons} onInsert={handleInsert} insertingKey={insertingKey} />
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
  onInsert,
  insertingKey,
}: {
  items: readonly PhosphorIconCatalogItem[];
  onInsert: (item: PhosphorIconCatalogItem) => Promise<void>;
  insertingKey: PhosphorIconKey | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => void onInsert(item)}
          className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 text-left transition-colors hover:bg-white/[0.05] disabled:cursor-wait disabled:opacity-60"
          disabled={insertingKey === item.key}
        >
          <div className="flex h-16 items-center justify-center rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.03] text-white">
            <PhosphorIconPreview iconKey={item.key} size={28} />
          </div>
          <div className="mt-3 truncate text-sm font-bold text-white">{item.label}</div>
          <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{item.key}</div>
        </button>
      ))}
    </div>
  );
}
