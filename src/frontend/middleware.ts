import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { resolveAuthRoute } from "./src/lib/auth-routing";

export async function middleware(request: NextRequest) {
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const resolution = resolveAuthRoute(
        request.nextUrl.pathname,
        request.nextUrl.search,
        Boolean(token)
    );

    if (resolution.action === "redirectHome") {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (resolution.action === "redirectLogin") {
        return NextResponse.redirect(new URL(resolution.destination, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/auth/:path*",
        "/products/:path*",
        "/templates/:path*",
        "/print-intents/:path*",
        "/approvals/:path*",
        "/vendors/:path*",
        "/categories/:path*",
        "/audit-logs/:path*",
        "/admin/:path*",
        "/content-library/:path*",
    ],
};
