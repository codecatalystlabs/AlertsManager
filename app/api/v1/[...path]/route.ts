import { NextRequest } from "next/server";

import { getServerApiBaseUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

/**
 * Only forward the headers the upstream API actually consumes. Forwarding the
 * whole browser header set leaks the localhost cookie jar (shared across every
 * dev app on localhost) and trips 431 Request Header Fields Too Large on the
 * upstream. Auth is a Bearer token, so cookies are never needed.
 */
const FORWARDED_REQUEST_HEADERS = [
	"accept",
	"accept-language",
	"authorization",
	"content-type",
];

const HOP_BY_HOP_RESPONSE_HEADERS = [
	"connection",
	"content-encoding",
	"content-length",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
];

type RouteContext = {
	params: Promise<{ path: string[] }>;
};

function buildUpstreamUrl(path: string[], search: string): string {
	const apiBase = getServerApiBaseUrl();
	const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
	return `${apiBase}/${encodedPath}${search}`;
}

function getRequestHeaders(request: NextRequest): Headers {
	const headers = new Headers();
	for (const header of FORWARDED_REQUEST_HEADERS) {
		const value = request.headers.get(header);
		if (value) headers.set(header, value);
	}
	return headers;
}

function getResponseHeaders(upstreamHeaders: Headers): Headers {
	const headers = new Headers(upstreamHeaders);
	for (const header of HOP_BY_HOP_RESPONSE_HEADERS) {
		headers.delete(header);
	}
	return headers;
}

async function getRequestBody(request: NextRequest): Promise<BodyInit | undefined> {
	if (request.method === "GET" || request.method === "HEAD") {
		return undefined;
	}

	const body = await request.arrayBuffer();
	return body.byteLength > 0 ? body : undefined;
}

async function proxyApiRequest(
	request: NextRequest,
	context: RouteContext
): Promise<Response> {
	const { path } = await context.params;
	const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.search);

	try {
		const upstreamResponse = await fetch(upstreamUrl, {
			method: request.method,
			headers: getRequestHeaders(request),
			body: await getRequestBody(request),
			cache: "no-store",
		});

		return new Response(await upstreamResponse.arrayBuffer(), {
			status: upstreamResponse.status,
			statusText: upstreamResponse.statusText,
			headers: getResponseHeaders(upstreamResponse.headers),
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return Response.json(
			{
				error: "API proxy failed",
				details: `Cannot reach upstream API ${upstreamUrl}: ${message}`,
			},
			{ status: 502 }
		);
	}
}

export const GET = proxyApiRequest;
export const POST = proxyApiRequest;
export const PUT = proxyApiRequest;
export const PATCH = proxyApiRequest;
export const DELETE = proxyApiRequest;
