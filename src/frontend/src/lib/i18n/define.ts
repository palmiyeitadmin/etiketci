import type { Locale } from "./messages";

/**
 * The English side of a message module must mirror the Turkish side exactly: the same keys,
 * nested the same way, and functions with the same parameters. String literals widen to string.
 * A missing, extra or mistyped key is a compile error.
 */
export type Shape<T> = T extends (...args: infer A) => infer R
    ? (...args: A) => R extends string ? string : R
    : T extends string
        ? string
        : T extends readonly (infer U)[]
            ? readonly Shape<U>[]
            : T extends object
                ? { [K in keyof T]: Shape<T[K]> }
                : T;

/** Rejects keys on `E` that `T` does not have (object literals already do this; this covers spreads). */
type Exact<T, E> = E & Record<Exclude<keyof E, keyof T>, never>;

export type MessageModule<T> = { tr: Shape<T>; en: Shape<T> };

/**
 * Declares a message module. Turkish is the source of truth for the shape.
 *
 * @example
 * export default defineMessages({ tr: { title: "Baskı", count: (n: number) => `${n} adet` } },
 *     { title: "Print", count: (n: number) => `${n} pcs` });
 */
export function defineMessages<T extends object, E extends Shape<T>>(
    source: { tr: T },
    en: Exact<Shape<T>, E>,
): MessageModule<T> {
    return { tr: source.tr as Shape<T>, en: en as Shape<T> };
}

export function pickLocale<T>(module: MessageModule<T>, locale: Locale): Shape<T> {
    return module[locale];
}
