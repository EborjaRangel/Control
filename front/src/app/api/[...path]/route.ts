import { NextRequest, NextResponse } from "next/server";

function apiBaseUrl() {
  return (
    process.env.API_PROXY_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:4000"
  );
}

function forwardRequestHeaders(request: NextRequest) {
  const headers = new Headers();
  const allowed = ["content-type", "authorization", "accept", "accept-language"];

  for (const name of allowed) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

async function proxyRequest(request: NextRequest, path: string[]) {
  const target = `${apiBaseUrl()}/api/${path.join("/")}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(target, {
    method: request.method,
    headers: forwardRequestHeaders(request),
    body,
    cache: "no-store",
  });

  const responseBody = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "application/json";

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
