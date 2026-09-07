export const JSON_HEADERS = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
};
export const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" };

const CORS = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
};

export function corsHeaders() {
    return { ...CORS };
}

export const SECURITY_HEADERS = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "same-origin",
    "permissions-policy": "geolocation=(), microphone=(), camera=(), usb=()",
};

export function json(data, status = 200, extra = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...JSON_HEADERS, ...extra },
    });
}

export function jsonError(message, status = 400, extra = {}) {
    return json({ ok: false, error: message }, status, extra);
}

export function html(body, status = 200, extra = {}) {
    return new Response(body, { status, headers: { ...HTML_HEADERS, ...extra } });
}

export function plain(body, status = 200, extra = {}) {
    return new Response(body, { status, headers: extra });
}

export async function readJson(request) {
    if (!request.body) return {};
    const text = await request.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        const err = new Error("请求体不是合法 JSON");
        err.status = 400;
        throw err;
    }
}
