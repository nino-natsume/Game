import { html } from "../lib/http.js";

export const ASSET_CACHE_TTL = "public, max-age=86400";

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".mp4": "video/mp4",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".wasm": "application/wasm",
    ".pak": "application/octet-stream",
    ".bin": "application/octet-stream",
    ".txt": "text/plain; charset=utf-8",
    ".ini": "text/plain; charset=utf-8",
    ".pak.info": "application/json",
};

function extOf(path) {
    const lower = path.toLowerCase();
    if (lower.endsWith(".pak.info")) return ".pak.info";
    const idx = lower.lastIndexOf(".");
    return idx >= 0 ? lower.slice(idx) : "";
}

function mimeOf(path) {
    return MIME[extOf(path)] || "application/octet-stream";
}

export function normalizeAssetKey(urlPath) {
    let keep = urlPath;
    try { keep = decodeURIComponent(keep); } catch {}
    keep = keep.replace(/^\/?(assets)?\/?/i, "");
    const parts = keep.split("/").filter((p) => p && p !== "." && p !== "..");
    if (!parts.length || parts.includes("..")) return null;
    return parts.join("/");
}

function assetCandidates(key) {
    const set = new Set([key]);
    const add = (k) => k && set.add(k);
    const segs = key.split("/");
    let upper = key;
    if (segs[0]) {
        upper = segs.map((s, i) => (i === 0 ? s[0].toUpperCase() + s.slice(1) : s)).join("/");
        add(upper);
    }
    add(key + "_");
    add(upper + "_");
    if (key.startsWith("img/characters/")) {
        const rel = key.slice("img/characters/".length);
        const sub = "img/characters/actor/" + rel;
        add(sub);
        add(sub + "_");
        const subSegs = sub.split("/");
        subSegs[0] = subSegs[0][0].toUpperCase() + subSegs[0].slice(1);
        add(subSegs.join("/"));
        add(subSegs.join("/") + "_");
    }
    return [...set];
}

async function serveFromBucket(bucket, key) {
    let obj = await bucket.get(key);
    if (!obj) {
        for (const alt of assetCandidates(key)) {
            if (alt === key) continue;
            obj = await bucket.get(alt);
            if (obj) break;
        }
    }
    if (!obj && !extOf(key)) {
        for (const base of assetCandidates(key)) {
            const idx = await bucket.get(base + "/index.html");
            if (idx) {
                return new Response(idx.body, {
                    headers: { "content-type": mimeOf("index.html"), "cache-control": ASSET_CACHE_TTL },
                });
            }
        }
    }
    if (!obj) return null;
    return new Response(obj.body, {
        headers: {
            "content-type": obj.httpMetadata?.contentType || mimeOf(key),
            "cache-control": obj.httpMetadata?.cacheControl || ASSET_CACHE_TTL,
        },
    });
}

export async function serveSlugAsset(urlPath, env, slug) {
    const marker = `/${slug}/assets/`;
    const idx = urlPath.indexOf(marker);
    if (idx < 0) return html("<h1>404 Not Found</h1>", 404);
    const rel = urlPath.slice(idx + marker.length);
    const key = normalizeAssetKey("/" + rel);
    if (!key) return html("<h1>400 Bad Request</h1>", 400);

    const bucket = env[`${slug.toUpperCase()}_ASSETS`];
    if (!bucket) return html(`<h1>站点 "${slug}" 未配置</h1>`, 404);

    const resp = await serveFromBucket(bucket, key);
    if (!resp) return html("<h1>404 Not Found</h1><p>resource: " + key + "</p>", 404);
    return resp;
}

export async function serveMainAsset(urlPath, env) {
    const key = normalizeAssetKey(urlPath);
    if (!key) return html("<h1>400 Bad Request</h1>", 400);
    const bucket = env.GAME_ASSETS;
    if (!bucket) return html("<h1>404 Not Found</h1>", 404);
    const resp = await serveFromBucket(bucket, key);
    if (!resp) return html("<h1>404 Not Found</h1><p>resource: " + key + "</p>", 404);
    return resp;
}

function serveFromEnisiaBucket(urlPath, env) {
    const key = normalizeAssetKey(urlPath);
    if (!key) return html("<h1>400 Bad Request</h1>", 400);
    if (!env.GAME_ASSETS) return html("<h1>404 Not Found</h1>", 404);
    return serveFromBucket(env.GAME_ASSETS, key);
}

export async function serveEnisiaAsset(urlPath, env) {
    const rel = urlPath.slice("/enisia/assets/".length);
    const resp = await serveFromEnisiaBucket("/" + rel, env);
    if (!resp) return html("<h1>404 Not Found</h1><p>resource: " + rel + "</p>", 404);
    return resp;
}

export async function serveEnisiaAny(urlPath, env) {
    const rel = urlPath.slice("/enisia/".length);
    if (!rel) return null;
    const resp = await serveFromEnisiaBucket("/" + rel, env);
    return resp;
}
