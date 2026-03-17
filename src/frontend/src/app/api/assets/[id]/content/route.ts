import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { buildApiUrl } from "@/lib/api-base-url";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
  }

  const response = await fetch(buildApiUrl(`/api/assets/${params.id}/content`), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    return new NextResponse(body || "Asset content fetch failed.", {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "text/plain; charset=utf-8",
      },
    });
  }

  const bytes = await response.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") || "application/octet-stream",
      "cache-control": "private, no-store",
    },
  });
}
