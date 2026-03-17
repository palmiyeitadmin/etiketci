import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { buildApiUrl } from "@/lib/api-base-url";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
  }

  const productId = request.nextUrl.searchParams.get("productId");
  const query = productId ? `?productId=${encodeURIComponent(productId)}` : "";
  const backendUrl = buildApiUrl(`/api/Templates/${params.id}/versions/${params.versionId}/preview${query}`);

  const response = await fetch(backendUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/pdf",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    return new NextResponse(body || "Preview fetch failed.", {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "text/plain; charset=utf-8",
      },
    });
  }

  const pdf = await response.arrayBuffer();
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") || "application/pdf",
      "content-disposition": `inline; filename="template_${params.id}_${params.versionId}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
