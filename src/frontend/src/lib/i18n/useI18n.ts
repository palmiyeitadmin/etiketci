"use client";

import { useMemo } from "react";
import { Locale, localeFormatMap, localeLabels, messages } from "./messages";
import { useLanguageStore } from "./useLanguageStore";

type MessageTree = typeof messages;

function resolveValue(locale: Locale, key: string): string | null {
    const segments = key.split(".");
    let current: unknown = messages[locale];

    for (const segment of segments) {
        if (!current || typeof current !== "object" || !(segment in current)) {
            return null;
        }

        current = (current as Record<string, unknown>)[segment];
    }

    return typeof current === "string" ? current : null;
}

function interpolate(template: string, values?: Record<string, string | number>) {
    if (!values) {
        return template;
    }

    return Object.entries(values).reduce(
        (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
        template
    );
}

export function translate(locale: Locale, key: string, fallback?: string, values?: Record<string, string | number>) {
    const template = resolveValue(locale, key);
    if (!template) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`Missing translation key: ${key}`);
        }
        return interpolate(fallback || key, values);
    }

    return interpolate(template, values);
}

export function translateKnownLabel(locale: Locale, label: string) {
    const dictionary = messages[locale].status.generic as Record<string, string>;
    return dictionary[label] || label;
}

function formatValue(locale: Locale, value: string | number | Date, formatter: "date" | "time" | "dateTime", options?: Intl.DateTimeFormatOptions) {
    const date = value instanceof Date ? value : new Date(value);
    const formatLocale = localeFormatMap[locale];

    if (formatter === "date") {
        return date.toLocaleDateString(formatLocale, options);
    }

    if (formatter === "time") {
        return date.toLocaleTimeString(formatLocale, options);
    }

    return date.toLocaleString(formatLocale, options);
}

export function useI18n() {
    const locale = useLanguageStore((state) => state.locale);
    const setLocale = useLanguageStore((state) => state.setLocale);

    return useMemo(
        () => ({
            locale,
            localeLabel: localeLabels[locale],
            setLocale,
            t: (key: string, fallback?: string, values?: Record<string, string | number>) => translate(locale, key, fallback, values),
            translateLabel: (label: string) => translateKnownLabel(locale, label),
            formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => formatValue(locale, value, "date", options),
            formatTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => formatValue(locale, value, "time", options),
            formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => formatValue(locale, value, "dateTime", options),
        }),
        [locale, setLocale]
    );
}

export type TranslationMessages = MessageTree;
export type TranslationKey = string;
