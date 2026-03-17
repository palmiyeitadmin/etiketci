export const publicAuthPaths = ["/auth/login", "/auth/setup-password"] as const;

const protectedPrefixes = [
    "/products",
    "/templates",
    "/print-intents",
    "/approvals",
    "/vendors",
    "/categories",
    "/audit-logs",
    "/admin",
    "/content-library",
] as const;

export type AuthRouteResolution =
    | { action: "allow" }
    | { action: "redirectHome" }
    | { action: "redirectLogin"; destination: string };

export function isPublicAuthPath(pathname: string) {
    return publicAuthPaths.includes(pathname as (typeof publicAuthPaths)[number]);
}

export function isProtectedAppPath(pathname: string) {
    if (pathname === "/" || pathname === "/auth/force-change-password") {
        return true;
    }

    return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function buildLoginRedirectPath(pathWithSearch: string) {
    const destination = pathWithSearch || "/";
    return `/auth/login?callbackUrl=${encodeURIComponent(destination)}`;
}

export function resolveAuthRoute(pathname: string, search: string, isAuthenticated: boolean): AuthRouteResolution {
    if (isAuthenticated && pathname === "/auth/login") {
        return { action: "redirectHome" };
    }

    if (!isAuthenticated && isProtectedAppPath(pathname)) {
        return {
            action: "redirectLogin",
            destination: buildLoginRedirectPath(`${pathname}${search}`),
        };
    }

    return { action: "allow" };
}
