"use client";

import { useLanguageStore } from "./useLanguageStore";
import type { Locale } from "./messages";
import { textModules, type TextNamespace, type TextOf } from "./text";

/** Texts of one module for a given locale, for code outside React (helpers, formatters). */
export function getText<N extends TextNamespace>(namespace: N, locale: Locale): TextOf<N> {
    return textModules[namespace][locale] as TextOf<N>;
}

/**
 * Typed texts of one module in the current language.
 *
 * @example
 * const text = useText("print");
 * <h1>{text.title}</h1> · {text.labels(quantity)}
 */
export function useText<N extends TextNamespace>(namespace: N): TextOf<N> {
    const locale = useLanguageStore((state) => state.locale);
    return getText(namespace, locale);
}
