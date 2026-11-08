import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { cookies } from "next/headers";
import { buildApiUrl } from "@/lib/api-base-url";
import { localeCookieName, normalizeLocale } from "@/lib/i18n/messages";
import { textModules } from "@/lib/i18n/text";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * This route opens in its own browser tab, so a failure is shown as a short page in the user's language
 * instead of the API's JSON.
 */
async function failurePage(response: Response) {
  const locale = normalizeLocale(cookies().get(localeCookieName)?.value);
  const text = textModules.errors[locale];
  let message = "";
  try {
    const body = (await response.json()) as { code?: string; error?: unknown; params?: Record<string, string> };
    const phrase = body.code ? text.api[body.code] : undefined;
    message = phrase ? phrase(body.params ?? {}) : typeof body.error === "string" ? body.error : "";
  } catch {
    message = "";
  }
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(text.pdfPage.title)}</title>
<style>body{margin:0;font:14px/20px system-ui,sans-serif;background:#fafafa;color:#171717;display:grid;place-items:center;min-height:100vh}main{max-width:420px;padding:24px}h1{font-size:16px;font-weight:600;margin:0 0 8px}p{margin:0 0 6px;color:#525252}@media(prefers-color-scheme:dark){body{background:#141415;color:#ededed}p{color:#a1a1a6}}</style></head>
<body><main><h1>${escapeHtml(text.pdfPage.title)}</h1>${message ? `<p>${escapeHtml(message)}</p>` : ""}<p>${escapeHtml(text.pdfPage.hint)}</p></main></body></html>`;
  return new NextResponse(html, { status: response.status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/** The print PDF of a request (stored label, one page per copy), proxied with the user's token. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
  }

  const response = await fetch(buildApiUrl(`/api/PrintIntents/${encodeURIComponent(params.id)}/pdf`), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/pdf" },
    cache: "no-store",
  });

  if (!response.ok) {
    return failurePage(response);
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": response.headers.get("content-disposition") || `inline; filename="baski-${params.id}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
