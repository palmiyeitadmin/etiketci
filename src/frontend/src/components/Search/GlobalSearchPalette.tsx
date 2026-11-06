"use client";

import { ArrowDown, ArrowUp, MagnifyingGlass } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchEverywhere } from "@/lib/search";
import { useI18n } from "@/lib/i18n";
import { SearchGroup, SearchItem } from "@/types/search";

// The search API answers in English; these tables give the Turkish UI its own words.
const groupLabels: Record<string, { tr: string; en: string }> = {
  pages: { tr: "Sayfalar", en: "Pages" },
  templates: { tr: "Şablonlar", en: "Templates" },
  products: { tr: "Ürünler", en: "Products" },
  printintents: { tr: "Baskı talepleri", en: "Print requests" },
  users: { tr: "Kullanıcılar", en: "Users" },
  roles: { tr: "Roller", en: "Roles" },
};

const typeLabels: Record<string, { tr: string; en: string }> = {
  page: { tr: "sayfa", en: "page" },
  template: { tr: "şablon", en: "template" },
  product: { tr: "ürün", en: "product" },
  "print-intent": { tr: "baskı", en: "print" },
  user: { tr: "kullanıcı", en: "user" },
  role: { tr: "rol", en: "role" },
};

const pageLabels: Record<string, { tr: [string, string]; en: [string, string] }> = {
  "/": { tr: ["Panel", "Genel durum"], en: ["Dashboard", "Overview"] },
  "/products": { tr: ["Ürünler", "Ürün kataloğu"], en: ["Products", "Product catalog"] },
  "/templates": { tr: ["Şablonlar", "Etiket şablonları ve sürümleri"], en: ["Templates", "Label templates and versions"] },
  "/print-intents": { tr: ["Baskı talepleri", "Baskı kuyruğu"], en: ["Print requests", "Print queue"] },
  "/approvals": { tr: ["Onaylar", "Onay bekleyen sürümler"], en: ["Approvals", "Versions waiting for review"] },
  "/admin/users": { tr: ["Kullanıcılar", "Kullanıcı yönetimi"], en: ["Users", "User management"] },
  "/admin/roles": { tr: ["Roller", "Rol ve yetki yönetimi"], en: ["Roles", "Roles and permissions"] },
  "/content-library": { tr: ["Kütüphane", "Şablon görselleri"], en: ["Library", "Template images"] },
};

export function GlobalSearchPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale, translateLabel } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const text = locale === "tr"
    ? { label: "Ara", placeholder: "Ara", searching: "Aranıyor", results: (n: number) => `${n} sonuç`, noResults: "Sonuç bulunamadı", move: "gezin", open: "aç", close: "kapat" }
    : { label: "Search", placeholder: "Search", searching: "Searching", results: (n: number) => `${n} ${n === 1 ? "result" : "results"}`, noResults: "No results", move: "move", open: "open", close: "close" };

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
        setActiveIndex(0);
      }
      setLoading(false);
    }, query.trim() ? 180 : 0);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const flatItems = useMemo(() => groups.flatMap((group) => group.items.map((item) => ({ group, item }))), [groups]);
  const resultCount = flatItems.length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!open) {
          return;
        }
      }

      if (!open) return;

      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (resultCount === 0) return;
        event.preventDefault();
        setActiveIndex((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + resultCount) % resultCount);
        return;
      }

      if (event.key === "Enter") {
        const target = flatItems[activeIndex];
        if (!target) return;
        event.preventDefault();
        router.push(target.item.href);
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, flatItems, onClose, open, resultCount, router]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) {
    return null;
  }

  const groupLabel = (group: SearchGroup) => groupLabels[group.key]?.[locale] ?? group.label;
  const typeLabel = (type: string) => typeLabels[type]?.[locale] ?? type;
  const itemText = (item: SearchItem): [string, string | undefined] => {
    if (item.type === "page" && pageLabels[item.href]) return pageLabels[item.href][locale];
    return [item.label, item.description];
  };

  let runningIndex = -1;

  return (
    <div className="animate-plms-fade fixed inset-0 z-[60] bg-ink/20 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={text.label}
        className="mx-auto mt-[12vh] flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <MagnifyingGlass size={18} aria-hidden className="shrink-0 text-ink-3" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={text.label}
            aria-controls="global-search-results"
            className="h-12 w-full bg-transparent text-md text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
            placeholder={text.placeholder}
          />
          {loading ? <span aria-hidden className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" /> : null}
        </div>

        <div ref={listRef} id="global-search-results" role="listbox" className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
          {groups.map((group) => group.items.length === 0 ? null : (
            <section key={group.key} className="pb-2 last:pb-0">
              <div className="px-2 pb-1 pt-2 text-sm text-ink-3">{groupLabel(group)}</div>
              {group.items.map((item) => {
                runningIndex += 1;
                const index = runningIndex;
                const active = index === activeIndex;
                const [label, description] = itemText(item);
                return (
                  <Link
                    key={`${group.key}-${item.id}`}
                    href={item.href}
                    onClick={onClose}
                    onMouseMove={() => setActiveIndex(index)}
                    data-index={index}
                    role="option"
                    aria-selected={active}
                    className={`flex h-12 items-center gap-3 rounded-lg px-2 transition-colors ${active ? "bg-raised" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base text-ink">{label}</div>
                      {description ? <div className="truncate text-sm text-ink-3">{description}</div> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {item.badge ? <span className="text-sm text-ink-3">{translateLabel(item.badge)}</span> : null}
                      <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-xs text-ink-3">{typeLabel(item.type)}</span>
                    </div>
                  </Link>
                );
              })}
            </section>
          ))}
          {!loading && resultCount === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-ink-3">{text.noResults}</div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-2.5 text-xs text-ink-3">
          <span className="tabular">{loading ? text.searching : text.results(resultCount)}</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="plms-kbd"><ArrowUp size={12} aria-hidden /></kbd>
              <kbd className="plms-kbd"><ArrowDown size={12} aria-hidden /></kbd>
              {text.move}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="plms-kbd">Enter</kbd>
              {text.open}
            </span>
            <button type="button" onClick={onClose} className="flex items-center gap-1.5 transition-colors hover:text-ink">
              <kbd className="plms-kbd">Esc</kbd>
              {text.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
