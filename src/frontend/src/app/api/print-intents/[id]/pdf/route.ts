import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { buildApiUrl } from "@/lib/api-base-url";

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
    const body = await response.text();
    return new NextResponse(body || "Print PDF could not be loaded.", {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "text/plain; charset=utf-8" },
    });
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
