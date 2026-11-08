"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
    ClockCounterClockwise,
    FolderOpen,
    House,
    ListChecks,
    List,
    MagnifyingGlass,
    Monitor,
    Moon,
    Package,
    Printer,
    SealCheck,
    ShieldCheck,
    SidebarSimple,
    SignOut,
    SquaresFour,
    Sun,
    Tag,
    Truck,
    UsersThree,
    type Icon,
} from "@phosphor-icons/react";
import { OperationalPulse } from "@/components/Operational/OperationalPulse";
import { GlobalSearchPalette } from "@/components/Search/GlobalSearchPalette";
import { PageTransition } from "@/components/PageTransition";
import { BrandLogo } from "@/components/BrandLogo";
import { useThemeStore } from "@/lib/theme/useThemeStore";
import type { ThemePreference } from "@/lib/theme/theme";
import { apiFetch } from "@/lib/api-client";
import { buildLoginRedirectPath, isProtectedAppPath } from "@/lib/auth-routing";
import { localeLabels, type Locale, useI18n } from "@/lib/i18n";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { DashboardActivity, DashboardSummary } from "@/types/dashboard";

type NavItem = {
    labelKey: string;
    href: string;
    icon: Icon;
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
            { labelKey: "nav.dashboard", href: "/", icon: House, permissions: [permissions.dashboardView] },
            { labelKey: "nav.printStation", href: "/print", icon: Printer, permissions: [permissions.printIntentsCreate] },
            { labelKey: "nav.printIntents", href: "/print-intents", icon: ListChecks, permissions: [permissions.printIntentsView] },
            { labelKey: "nav.products", href: "/products", icon: Package, permissions: [permissions.productsView] },
            { labelKey: "nav.templates", href: "/templates", icon: SquaresFour, permissions: [permissions.templatesView] },
            { labelKey: "nav.approvals", href: "/approvals", icon: SealCheck, permissions: [permissions.templatesReview, permissions.templatesPublish] },
            { labelKey: "nav.library", href: "/content-library", icon: FolderOpen, permissions: [permissions.assetsView] },
        ],
    },
    {
        labelKey: "nav.administration",
        items: [
            { labelKey: "nav.vendors", href: "/vendors", icon: Truck, permissions: [permissions.vendorsView] },
            { labelKey: "nav.categories", href: "/categories", icon: Tag, permissions: [permissions.categoriesView] },
            { labelKey: "nav.auditLogs", href: "/audit-logs", icon: ClockCounterClockwise, permissions: [permissions.auditView] },
            { labelKey: "nav.users", href: "/admin/users", icon: UsersThree, permissions: [permissions.usersView] },
            { labelKey: "nav.roles", href: "/admin/roles", icon: ShieldCheck, permissions: [permissions.rolesView] },
        ],
    },
];

const collapsedStorageKey = "plms.sidebar.collapsed";

const themeOptions: { value: ThemePreference; icon: Icon; label: string }[] = [
    { value: "light", icon: Sun, label: "shell.themeLight" },
    { value: "dark", icon: Moon, label: "shell.themeDark" },
    { value: "system", icon: Monitor, label: "shell.themeSystem" },
];

function ShellNavLink({
    active,
    item,
    label,
    onClick,
    collapsed,
}: {
    active: boolean;
    item: NavItem;
    label: string;
    onClick: () => void;
    collapsed?: boolean;
}) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? label : undefined}
            onClick={onClick}
            className={`relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-base transition-colors ${collapsed ? "justify-center" : ""} ${active
                ? "bg-raised font-medium text-ink"
                : "text-ink-2 hover:bg-raised hover:text-ink"}`}
        >
            {active ? <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" /> : null}
            <Icon size={18} weight={active ? "fill" : "regular"} className={`shrink-0 ${active ? "text-accent" : "text-ink-3"}`} />
            {!collapsed && <span className="min-w-0 truncate">{label}</span>}
        </Link>
    );
}

function getPageTitleKey(pathname: string) {
    if (pathname === "/") return "pageTitle.dashboard";
    if (pathname.startsWith("/products/import")) return "pageTitle.productsImport";
    if (pathname.startsWith("/products")) return "pageTitle.products";
    if (pathname.startsWith("/templates")) return "pageTitle.templates";
    if (pathname.startsWith("/content-library")) return "pageTitle.library";
    if (pathname.startsWith("/print-intents")) return "pageTitle.printIntents";
    if (pathname === "/print") return "pageTitle.printStation";
    if (pathname.startsWith("/approvals")) return "pageTitle.approvals";
    if (pathname.startsWith("/vendors")) return "pageTitle.vendors";
    if (pathname.startsWith("/categories")) return "pageTitle.categories";
    if (pathname.startsWith("/audit-logs")) return "pageTitle.auditLogs";
    if (pathname.startsWith("/admin/users")) return "pageTitle.users";
    if (pathname.startsWith("/admin/roles")) return "pageTitle.roles";
    return "pageTitle.fallback";
}

function initials(value: string) {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toLocaleUpperCase("tr-TR") || "?";
}

function ShellSpinner({ label }: { label: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas">
            <div className="flex items-center gap-3 text-sm text-ink-2">
                <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
                {label}
            </div>
        </div>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const { locale, setLocale, t } = useI18n();
    const themePreference = useThemeStore((state) => state.preference);
    const setThemePreference = useThemeStore((state) => state.setPreference);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [pulseExpanded, setPulseExpanded] = useState(false);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [activity, setActivity] = useState<DashboardActivity | null>(null);

    const isAuthRoute = pathname.startsWith("/auth/");
    const isEditorRoute = /^\/templates\/[^/]+\/edit$/.test(pathname);
    // The editor needs the width: the sidebar collapses to icons there.
    const collapsed = desktopCollapsed || isEditorRoute;
    const sessionRoles = (session?.user as any)?.roles as string[] | undefined;
    const sessionPermissions = (session?.user as any)?.permissions as string[] | undefined;
    const userRoles = useMemo(() => sessionRoles ?? [], [sessionRoles]);
    const userPermissions = useMemo(() => sessionPermissions ?? [], [sessionPermissions]);
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
        try {
            setDesktopCollapsed(window.localStorage.getItem(collapsedStorageKey) === "1");
        } catch {
            // Storage can be unavailable (private mode); the sidebar simply starts expanded.
        }
    }, []);

    const toggleCollapsed = () => {
        setDesktopCollapsed((current) => {
            const next = !current;
            try {
                window.localStorage.setItem(collapsedStorageKey, next ? "1" : "0");
            } catch {
                // Not critical.
            }
            return next;
        });
    };

    useEffect(() => {
        if (session && mustChangePassword && pathname !== "/auth/force-change-password") {
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
        // Refresh when the user moves between pages, so the pulse does not go stale.
    }, [session, pathname]);

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

    useEffect(() => {
        if (isAuthRoute || status !== "unauthenticated" || !isProtectedAppPath(pathname)) {
            return;
        }

        const search = searchParams.toString();
        router.replace(buildLoginRedirectPath(`${pathname}${search ? `?${search}` : ""}`));
    }, [isAuthRoute, pathname, router, searchParams, status]);

    if (isAuthRoute) {
        return <>{children}</>;
    }

    if (status === "loading") {
        return <ShellSpinner label={t("common.loading")} />;
    }

    if (!session && isProtectedAppPath(pathname)) {
        return <ShellSpinner label={t("auth.login.initializing")} />;
    }

    if (!session) {
        return <>{children}</>;
    }

    const userName = session.user?.name || session.user?.email || "";
    const sidebarWidthClass = collapsed ? "md:w-16" : "md:w-[248px]";
    const contentPaddingClass = collapsed ? "md:pl-16" : "md:pl-[248px]";

    return (
        <div className={isEditorRoute ? "h-screen overflow-hidden bg-canvas text-ink" : "min-h-screen bg-canvas text-ink"}>
            <GlobalSearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

            <div
                className={`fixed inset-0 z-40 bg-ink/30 transition-opacity md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={() => setMobileOpen(false)}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-line bg-surface transition-transform md:translate-x-0 ${sidebarWidthClass} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className={`flex h-14 shrink-0 items-center border-b border-line ${collapsed ? "justify-center px-2" : "px-4"}`}>
                    <Link href="/" aria-label="Palmiye Etiket" className="flex min-w-0 items-center gap-2" onClick={() => setMobileOpen(false)}>
                        {collapsed ? (
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-medium text-canvas">P</span>
                        ) : (
                            <>
                                <BrandLogo width={98} height={32} priority className="h-6 w-auto" />
                                <span className="text-sm text-ink-3">Etiket</span>
                            </>
                        )}
                    </Link>
                </div>

                <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Palmiye Etiket">
                    {visibleGroups.map((group, index) => (
                        <section key={group.labelKey} className={index === 0 ? "" : "mt-6"}>
                            {collapsed ? (
                                index === 0 ? null : <div className="mx-auto mb-2 w-6 border-t border-line" />
                            ) : (
                                <div className="mb-1 px-2.5 text-xs text-ink-3">{t(group.labelKey)}</div>
                            )}
                            <div className="flex flex-col gap-0.5">
                                {group.items.map((item) => {
                                    // Match whole path segments, so "/print" is not active on "/print-intents".
                                    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                                    return (
                                        <ShellNavLink
                                            key={item.href}
                                            item={item}
                                            active={active}
                                            label={t(item.labelKey)}
                                            collapsed={collapsed}
                                            onClick={() => setMobileOpen(false)}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </nav>

                <div className={`shrink-0 border-t border-line ${collapsed ? "px-2 py-3" : "p-3"}`}>
                    {mustChangePassword && !collapsed ? (
                        <p className="mb-2 rounded-lg bg-warn-soft px-2.5 py-2 text-sm text-warn">{t("shell.passwordRotationRequired")}</p>
                    ) : null}
                    <div className={`flex items-center gap-2.5 ${collapsed ? "flex-col" : ""}`}>
                        <span
                            aria-hidden
                            title={collapsed ? userName : undefined}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-medium text-ink-2"
                        >
                            {initials(userName)}
                        </span>
                        {!collapsed ? (
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-base text-ink">{userName}</div>
                                <div className="truncate text-xs text-ink-3">{userRoles.length > 0 ? userRoles.join(", ") : t("common.unknown")}</div>
                            </div>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: "/auth/login" })}
                            className="plms-button-ghost h-8 w-8 shrink-0 px-0"
                            title={t("shell.signOut")}
                            aria-label={t("shell.signOut")}
                        >
                            <SignOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            <div className={`flex min-w-0 flex-col ${isEditorRoute ? "h-screen" : "min-h-screen"} ${contentPaddingClass}`}>
                {isEditorRoute ? null : (
                    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas/95 px-4 md:px-6">
                        <button
                            type="button"
                            className="plms-button-ghost h-8 w-8 px-0 md:hidden"
                            onClick={() => setMobileOpen(true)}
                            aria-label={t("shell.menu")}
                        >
                            <List size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={toggleCollapsed}
                            className="plms-button-ghost hidden h-8 w-8 px-0 md:inline-flex"
                            aria-label={desktopCollapsed ? t("shell.expand") : t("shell.collapse")}
                            title={desktopCollapsed ? t("shell.expand") : t("shell.collapse")}
                        >
                            <SidebarSimple size={18} />
                        </button>
                        <div className="min-w-0 flex-1 truncate text-base font-medium text-ink">{t(getPageTitleKey(pathname))}</div>

                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 sm:w-56"
                            aria-label={t("shell.searchTitle")}
                        >
                            <MagnifyingGlass size={16} />
                            <span className="hidden flex-1 text-left sm:inline">{t("shell.searchTitle")}</span>
                            <kbd className="plms-kbd hidden sm:inline-flex">Ctrl K</kbd>
                        </button>

                        <OperationalPulse
                            summary={summary}
                            activity={activity}
                            expanded={pulseExpanded}
                            onToggle={() => setPulseExpanded((current) => !current)}
                        />

                        <div className="hidden items-center rounded-lg border border-line bg-surface p-0.5 sm:inline-flex" role="group" aria-label={t("shell.theme")}>
                            {themeOptions.map(({ value, icon: ThemeIcon, label }) => {
                                const active = themePreference === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={active}
                                        aria-label={t(label)}
                                        title={t(label)}
                                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${active ? "bg-raised text-ink" : "text-ink-3 hover:text-ink"}`}
                                        onClick={() => setThemePreference(value)}
                                    >
                                        <ThemeIcon size={15} />
                                    </button>
                                );
                            })}
                        </div>

                        <div className="hidden items-center rounded-lg border border-line bg-surface p-0.5 sm:inline-flex" role="group" aria-label="Dil / Language">
                            {(Object.keys(localeLabels) as Locale[]).map((option) => {
                                const active = locale === option;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        aria-pressed={active}
                                        className={`h-7 rounded-md px-2 text-xs font-medium transition-colors ${active ? "bg-raised text-ink" : "text-ink-3 hover:text-ink"}`}
                                        onClick={() => setLocale(option)}
                                    >
                                        {localeLabels[option]}
                                    </button>
                                );
                            })}
                        </div>
                    </header>
                )}
                <main className={`min-h-0 min-w-0 flex-1 ${isEditorRoute ? "overflow-hidden overscroll-none" : "px-4 py-6 md:px-8"}`}>
                    {isEditorRoute ? children : (
                        <div className="mx-auto w-full max-w-[1440px]">
                            <PageTransition>{children}</PageTransition>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
