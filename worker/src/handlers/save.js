import { json, jsonError } from "../lib/http.js";
import { requireUser } from "../lib/session.js";
import { findSiteBySlug } from "../lib/db.js";

export const MAX_SAVE_BYTES = 16 * 1024 * 1024;
export const SAVE_SCHEMA_VERSION = 1;

function saveKey(username) { return `saves/${username}.json`; }
function saveBackupKey(username) { return `saves/${username}.bak.json`; }

function wrapPayload(username, data) {
    return { schemaVersion: SAVE_SCHEMA_VERSION, updatedAt: Date.now(), savedBy: username, data };
}

async function readPayload(bucket, key) {
    const obj = await bucket.get(key);
    if (!obj) return null;
    const raw = await obj.text();
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !("schemaVersion" in parsed)) {
            return { payload: wrapPayload("", parsed.data || parsed), raw, legacy: true };
        }
        if (parsed && parsed.data && typeof parsed.data === "object") {
            return { payload: parsed, raw };
        }
    } catch {}
    return { corrupted: true, raw };
}

async function getSaveFrom(bucket, username) {
    const main = await readPayload(bucket, saveKey(username));
    if (!main) return json({ ok: true, schemaVersion: SAVE_SCHEMA_VERSION, data: {} });

    if (main.corrupted || !main.payload) {
        const bak = await readPayload(bucket, saveBackupKey(username));
        if (bak && bak.payload && !bak.corrupted) {
            return json({ ok: true, schemaVersion: SAVE_SCHEMA_VERSION, data: bak.payload.data || {}, fromBackup: true });
        }
        return json({ ok: true, schemaVersion: SAVE_SCHEMA_VERSION, data: {} });
    }

    return json({
        ok: true, schemaVersion: SAVE_SCHEMA_VERSION,
        updatedAt: main.payload.updatedAt || null, data: main.payload.data || {},
    });
}

async function putSaveTo(bucket, username, request) {
    const text = await request.text();
    if (text.length > MAX_SAVE_BYTES) return jsonError("存档超过大小上限", 413);
    let body;
    try { body = JSON.parse(text); } catch { return jsonError("请求体不是合法 JSON", 400); }
    const data = (body && body.data) || {};
    if (typeof data !== "object" || Array.isArray(data)) return jsonError("存档数据格式错误", 400);

    const key = saveKey(username);
    const next = JSON.stringify(wrapPayload(username, data));

    const existing = await readPayload(bucket, key);
    if (existing && existing.raw && !existing.corrupted) {
        await bucket.put(saveBackupKey(username), existing.raw, {
            httpMetadata: { contentType: "application/json" },
        });
    }

    await bucket.put(key, next, { httpMetadata: { contentType: "application/json" } });
    return json({ ok: true, updatedAt: Date.now() });
}

export async function getSave(request, env) {
    const username = await requireUser(request, env);
    if (!env.GAME_SAVES) return jsonError("存档存储未配置", 500);
    return getSaveFrom(env.GAME_SAVES, username);
}

export async function putSave(request, env) {
    const username = await requireUser(request, env);
    if (!env.GAME_SAVES) return jsonError("存档存储未配置", 500);
    return putSaveTo(env.GAME_SAVES, username, request);
}

export async function getSiteSave(request, env, url, params) {
    const username = await requireUser(request, env);
    const site = await findSiteBySlug(env.DB, params.slug);
    if (!site) return jsonError("站点不存在", 404);
    const bucket = env[`${params.slug.toUpperCase()}_SAVES`];
    if (!bucket) return jsonError("站点存档存储未配置", 500);
    return getSaveFrom(bucket, username);
}

export async function putSiteSave(request, env, url, params) {
    const username = await requireUser(request, env);
    const site = await findSiteBySlug(env.DB, params.slug);
    if (!site) return jsonError("站点不存在", 404);
    const bucket = env[`${params.slug.toUpperCase()}_SAVES`];
    if (!bucket) return jsonError("站点存档存储未配置", 500);
    return putSaveTo(bucket, username, request);
}