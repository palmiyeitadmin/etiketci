"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { OperationalPulse } from "@/components/Operational/OperationalPulse";
import { GlobalSearchPalette } from "@/components/Search/GlobalSearchPalette";
import { apiFetch } from "@/lib/api-client";
import { localeLabels, type Locale, useI18n } from "@/lib/i18n";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { DashboardActivity, DashboardSummary } from "@/types/dashboard";

type NavItem = {
    labelKey: string;
    href: string;
    permissions?: string[];
};

type NavGroup = {
    labelKey: string;
    items: NavItem[];
};

const navGroups: NavGroup[] = [
    {
        labelKey: "nav.operations",
        items: [
            { labelKey: "nav.dashboard", href: "/", permissions: [permissions.dashboardView] },
            { labelKey: "nav.products", href: "/products", permissions: [permissions.productsView] },
            { labelKey: "nav.templates", href: "/templates", permissions: [permissions.templatesView] },
            { labelKey: "nav.printIntents", href: "/print-intents", permissions: [permissions.printIntentsView] },
            { labelKey: "nav.approvals", href: "/approvals", permissions: [permissions.templatesReview, permissions.templatesPublish] },
            { labelKey: "nav.library", href: "/content-library", permissions: [permissions.assetsView] },
        ],
    },
    {
        labelKey: "nav.administration",
        items: [
            { labelKey: "nav.vendors", href: "/vendors", permissions: [permissions.vendorsView] },
            { labelKey: "nav.categories", href: "/categories", permissions: [permissions.categoriesView] },
            { labelKey: "nav.auditLogs", href: "/audit-logs", permissions: [permissions.auditView] },
            { labelKey: "nav.users", href: "/admin/users", permissions: [permissions.usersView] },
            { labelKey: "nav.roles", href: "/admin/roles", permissions: [permissions.rolesView] },
        ],
    },
];

function getPageTitleKey(pathname: string) {
    if (pathname === "/") return "pageTitle.dashboard";
    if (pathname.startsWith("/products/import")) return "pageTitle.productsImport";
    if (pathname.startsWith("/products")) return "pageTitle.products";
    if (pathname.startsWith("/templates")) return "pageTitle.templates";
    if (pathname.startsWith("/content-library")) return "pageTitle.library";
    if (pathname.startsWith("/print-intents")) return "pageTitle.printIntents";
    if (pathname.startsWith("/approvals")) return "pageTitle.approvals";
    if (pathname.startsWith("/vendors")) return "pageTitle.vendors";
    if (pathname.startsWith("/categories")) return "pageTitle.categories";
    if (pathname.startsWith("/audit-logs")) return "pageTitle.auditLogs";
    if (pathname.startsWith("/admin/users")) return "pageTitle.users";
    if (pathname.startsWith("/admin/roles")) return "pageTitle.roles";
    return "pageTitle.fallback";
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const { locale, setLocale, t } = useI18n();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [pulseExpanded, setPulseExpanded] = useState(false);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [activity, setActivity] = useState<DashboardActivity | null>(null);

    const isAuthRoute = pathname.startsWith("/auth/");
    const isEditorRoute = /^\/templates\/[^/]+\/edit$/.test(pathname);
    const userRoles = ((session?.user as any)?.roles || []) as string[];
    const userPermissions = ((session?.user as any)?.permissions || []) as string[];
    const mustChangePassword = Boolean((session?.user as any)?.mustChangePassword);

    const visibleGroups = useMemo(
        () => navGroups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => !item.permissions || userRoles.includes("Admin") || hasAnyPermission(userPermissions, item.permissions)),
            }))
            .filter((group) => group.items.length > 0),
        [userPermissions, userRoles]
    );

    useEffect(() => {
        if (!session) {
            return;
        }

        if (mustChangePassword && pathname !== "/auth/force-change-password") {
            router.replace("/auth/force-change-password");
        }
    }, [mustChangePassword, pathname, router, session]);

    useEffect(() => {
        if (!session) {
            return;
        }

        let cancelled = false;

        async function loadOperationalPulse() {
            const [summaryRes, activityRes] = await Promise.all([
                apiFetch<DashboardSummary>("/api/dashboard/summary"),
                apiFetch<DashboardActivity>("/api/dashboard/activity"),
            ]);

            if (cancelled) {
                return;
            }

            if (summaryRes.success) {
                setSummary(summaryRes.data);
            }

            if (activityRes.success) {
                setActivity(activityRes.data);
            }
        }

        void loadOperationalPulse();
        return () => {
            cancelled = true;
        };
    }, [session]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setSearchOpen(true);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    if (isAuthRoute || !session) {
        return <>{children}</>;
    }

    const shellRootClassName = isEditorRoute
        ? "h-screen overflow-hidden bg-[color:var(--plms-bg)] text-white"
        : "min-h-screen bg-[color:var(--plms-bg)] text-white";
    const shellFrameClassName = isEditorRoute ? "flex h-screen" : "flex min-h-screen";
    const contentColumnClassName = isEditorRoute
        ? "flex h-screen min-w-0 flex-1 flex-col md:min-h-0 md:pl-72 xl:pl-80"
        : "flex min-h-screen min-w-0 flex-1 flex-col md:min-h-0 md:pl-72 xl:pl-80";

    return (
        <div className={shellRootClassName}>
            <GlobalSearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
            <div className={shellFrameClassName}>
                <div className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setMobileOpen(false)} />
                <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-[color:var(--plms-border)] bg-[linear-gradient(180deg,#0e192b_0%,#0a1220_100%)] px-5 py-5 transition-transform md:translate-x-0 xl:w-80 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
                    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
                        <div className="rounded-[1.8rem] border border-[color:var(--plms-border)] bg-[radial-gradient(circle_at_top_left,rgba(36,99,235,0.22),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-3 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
                            <Link
                                href="/"
                                aria-label={t("shell.title")}
                                className="block overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950/20 px-3 py-2 transition-colors hover:bg-slate-950/28"
                            >
                                <div className="relative h-[76px] w-full">
                                    <Image
                                        src="/assets/palmiye_logo_white.png"
                                        alt={t("shell.title")}
                                        fill
                                        priority
                                        sizes="(max-width: 1279px) 240px, 272px"
                                        className="object-contain object-center"
                                    />
                                </div>
                            </Link>
                        </div>

                        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                            <div className="space-y-6">
                                {visibleGroups.map((group) => (
                                    <section key={group.labelKey} className="space-y-2">
                                        <div className="px-3 text-[10px] font-black uppercase tracking-[0.24em] text-[color:var(--plms-text-subtle)]">{t(group.labelKey)}</div>
                                        <div className="space-y-1.5">
                                            {group.items.map((item) => {
                                                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        className={`group relative flex items-center rounded-[1.25rem] px-4 py-3 text-sm font-bold transition-all ${active
                                                            ? "bg-[linear-gradient(90deg,rgba(37,99,235,0.18),rgba(37,99,235,0.06))] text-white shadow-[inset_0_0_0_1px_rgba(96,165,250,0.22)]"
                                                            : "text-[color:var(--plms-text-subtle)] hover:bg-white/[0.04] hover:text-white"}`}
                                                        onClick={() => setMobileOpen(false)}
                                                    >
                                                        <span className={`absolute left-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full transition-opacity ${active ? "opacity-100 bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.6)]" : "opacity-0 group-hover:opacity-60 bg-white/25"}`} />
                                                        <span className="pl-2">{t(item.labelKey)}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto rounded-[1.8rem] border border-[color:var(--plms-border)] bg-[linear-gradient(180deg,rgba(19,35,59,0.9),rgba(12,22,37,0.94))] p-4 shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[color:var(--plms-text-subtle)]">{t("shell.session")}</div>
                            <div className="mt-3 text-base font-black tracking-[-0.04em] text-white">{session.user?.name || session.user?.email}</div>
                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
                                {userRoles.length > 0 ? userRoles.join(" / ") : t("common.unknown")}
                            </div>
                            {mustChangePassword ? <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">{t("shell.passwordRotationRequired")}</div> : null}
                            <button
                                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.02] px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-muted)] transition-colors hover:bg-white/[0.06] hover:text-white"
                            >
                                {t("shell.signOut")}
                            </button>
                        </div>
                    </div>
                </aside>

                <div className={contentColumnClassName}>
                    <header className="sticky top-0 z-30 border-b border-[color:var(--plms-border)] bg-[color:var(--plms-bg)]/88 px-4 py-4 backdrop-blur md:px-8">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex items-center gap-3">
                                <button className="rounded-2xl border border-[color:var(--plms-border)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)] md:hidden" onClick={() => setMobileOpen(true)}>
                                    {t("shell.menu")}
                                </button>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("shell.suite")}</div>
                                    <div className="text-xl font-black tracking-[-0.04em] text-white">{t(getPageTitleKey(pathname))}</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSearchOpen(true)}
                                    className="flex min-w-[300px] items-center gap-3 rounded-[1.6rem] border border-[color:var(--plms-border)] bg-[linear-gradient(180deg,rgba(16,27,45,0.96),rgba(11,18,32,0.96))] px-4 py-3 text-left shadow-[0_16px_40px_rgba(2,6,23,0.25)] transition-colors hover:bg-white/[0.04]"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.03] text-blue-200">
                                        <MagnifyingGlass size={18} weight="bold" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("shell.searchTitle")}</div>
                                        <div className="truncate text-sm font-medium text-white/80">{t("shell.searchDescription")}</div>
                                    </div>
                                    <div className="rounded-full border border-[color:var(--plms-border)] px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">Ctrl K</div>
                                </button>
                                <div className="inline-flex items-center rounded-[1.2rem] border border-[color:var(--plms-border)] bg-[linear-gradient(180deg,rgba(16,27,45,0.98),rgba(10,20,35,0.98))] p-1 shadow-[0_18px_50px_rgba(3,8,20,0.18)]">
                                    {(Object.keys(localeLabels) as Locale[]).map((option) => {
                                        const active = locale === option;
                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                className={`rounded-[0.95rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${active ? "bg-blue-500 text-white" : "text-[color:var(--plms-text-subtle)] hover:text-white"}`}
                                                onClick={() => setLocale(option)}
                                            >
                                                {localeLabels[option]}
                                            </button>
                                        );
                                    })}
                                </div>
                                <OperationalPulse
                                    summary={summary}
                                    activity={activity}
                                    expanded={pulseExpanded}
                                    onToggle={() => setPulseExpanded((current) => !current)}
                                />
                            </div>
                        </div>
                    </header>
                    <main className={`min-h-0 min-w-0 flex-1 ${isEditorRoute ? "overflow-hidden overscroll-none p-0" : "overflow-y-auto px-4 py-6 md:px-8 md:py-8"}`}>{children}</main>
                </div>
            </div>
        </div>
    );
}
