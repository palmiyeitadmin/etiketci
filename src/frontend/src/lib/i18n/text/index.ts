/**
 * Registry of page and feature message modules, read with useText("namespace").
 * Add a module here when a screen gets its own texts; keep shared short strings in messages.ts (t()).
 */
import audit from "./audit";
import print from "./print";

export const textModules = {
    audit,
    print,
};

export type TextNamespace = keyof typeof textModules;
export type TextOf<N extends TextNamespace> = (typeof textModules)[N]["tr"];
