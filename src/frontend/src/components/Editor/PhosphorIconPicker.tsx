"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { getFeaturedPhosphorIcons, loadFullPhosphorIconCatalog, searchPhosphorIcons, type PhosphorIconCatalogItem, type PhosphorIconKey } from "@/lib/phosphor-icon-catalog";
import { useI18n } from "@/lib/i18n";

export function PhosphorIconPicker({
  onInsert,
}: {
  onInsert: (payload: { key: PhosphorIconKey; content: string; name: string }) => void | Promise<void>;
}) {
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [loadingFullCatalog, setLoadingFullCatalog] = useState(false);
  const [fullCatalog, setFullCatalog] = useState<PhosphorIconCatalogItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const featuredIcons = useMemo(() => getFeaturedPhosphorIcons(), []);
  const shouldShowFullCatalog = showAll || query.trim().length > 0;
  const [visibleIcons, setVisibleIcons] = useState<PhosphorIconCatalogItem[]>(featuredIcons);
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
        loading: "Phosphor katalogu yukleniyor...",
        failed: "Phosphor ikon katalogu yuklenemedi.",
        empty: "Sonuc bulunamadi.",
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
        loading: "Loading Phosphor catalog...",
        failed: "Phosphor icon catalog could not be loaded.",
        empty: "No results found.",
      };

  useEffect(() => {
    let cancelled = false;

    async function loadIcons() {
      if (!shouldShowFullCatalog) {
        setVisibleIcons(featuredIcons);
        return;
      }

      setLoadingFullCatalog(true);
      setLoadError(null);
      try {
        const catalog = fullCatalog.length > 0 ? fullCatalog : await loadFullPhosphorIconCatalog();
        if (!cancelled) {
          if (fullCatalog.length === 0) {
            setFullCatalog(catalog);
          }
          setVisibleIcons(await searchPhosphorIcons(query, { includeFull: true }));
        }
      } catch {
        if (!cancelled) {
          setLoadError(text.failed);
        }
      } finally {
        if (!cancelled) {
          setLoadingFullCatalog(false);
        }
      }
    }

    void loadIcons();
    return () => {
      cancelled = true;
    };
  }, [featuredIcons, fullCatalog, query, shouldShowFullCatalog, text.failed]);

  return (
    <div className="space-y-5">
      <input
        className="plms-input"
        placeholder={text.placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {!query.trim() ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--plms-text-subtle)]">{text.featured}</div>
              <p className="mt-1 text-sm text-[color:var(--plms-text-subtle)]">{text.featuredDescription}</p>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{featuredIcons.length} {text.icons}</div>
          </div>
          <IconGrid items={featuredIcons} onInsert={onInsert} />
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
          <>
            {loadingFullCatalog ? (
              <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-6 text-sm text-[color:var(--plms-text-subtle)]">
                {text.loading}
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-6 text-sm text-red-100">
                {loadError}
              </div>
            ) : visibleIcons.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-6 text-sm text-[color:var(--plms-text-subtle)]">
                {text.empty}
              </div>
            ) : (
              <IconGrid items={visibleIcons} onInsert={onInsert} />
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

function IconGrid({
  items,
  onInsert,
}: {
  items: PhosphorIconCatalogItem[];
  onInsert: (payload: { key: PhosphorIconKey; content: string; name: string }) => void | Promise<void>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => void onInsert({ key: item.key, content: "", name: item.label })}
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
  );
}
