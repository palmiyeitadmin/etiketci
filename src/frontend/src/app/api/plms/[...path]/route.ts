import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const DEFAULT_API_BASE_URL = "http://192.168.0.99:8080";

function getServerApiBaseUrl() {
  return (
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");
}

function buildProxyTarget(pathSegments: string[], search: string) {
  const normalizedPath = pathSegments.join("/");
  return `${getServerApiBaseUrl()}/${normalizedPath}${search}`;
}

function buildProxyHeaders(request: NextRequest) {
  const headers = new Headers();

  const authorization = request.headers.get("authorization");
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");
  const correlationId = request.headers.get("x-correlation-id");

  if (authorization) {
    headers.set("authorization", authorization);
  }

  if (accept) {
    headers.set("accept", accept);
  }

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (correlationId) {
    headers.set("x-correlation-id", correlationId);
  }

  return headers;
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const targetUrl = buildProxyTarget(params.path || [], request.nextUrl.search);
  const headers = buildProxyHeaders(request);
  const session = await getServerSession(authOptions);
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, init);
  const responseHeaders = new Headers(response.headers);

  responseHeaders.delete("content-length");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}
