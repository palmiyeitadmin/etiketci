/**
 * Registry of page and feature message modules, read with useText("namespace").
 * Add a module here when a screen gets its own texts; keep shared short strings in messages.ts (t()).
 */
import audit from "./audit";
import print from "./print";
import templates from "./templates";
import templateDetail from "./templateDetail";
import approvals from "./approvals";
import editor from "./editor";
import products from "./products";
import catalog from "./catalog";
import printRequests from "./printRequests";
import dashboard from "./dashboard";
import admin from "./admin";
import auth from "./auth";
import common from "./common";
import permissions from "./permissions";
import errors from "./errors";

export const textModules = {
    audit,
    print,
    templates,
    templateDetail,
    approvals,
    editor,
    products,
    catalog,
    printRequests,
    dashboard,
    admin,
    auth,
    common,
    permissions,
    errors,
};

export type TextNamespace = keyof typeof textModules;
export type TextOf<N extends TextNamespace> = (typeof textModules)[N]["tr"];
