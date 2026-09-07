import { json, jsonError, readJson } from "../lib/http.js";
import { requireUser, HttpError } from "../lib/session.js";
import { listAllSites, findSiteBySlug, findSiteById, insertSite, deleteSite, updateSite } from "../lib/db.js";

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,62}$/;

async function requireAdmin(request, env) {
    const username = await requireUser(request, env);
    const first = await env.DB.prepare("SELECT MIN(created_at) AS first FROM users").first();
    const mine = await env.DB.prepare("SELECT created_at FROM users WHERE username = ?").bind(username).first();
    if (!first || !mine || first.first !== mine.created_at) {
        throw new HttpError(403, "需要管理员权限");
    }
}

export async function listSitesHandler(request, env) {
    await requireUser(request, env);
    const sites = await listAllSites(env.DB);
    return json({ ok: true, sites });
}

export async function createSiteHandler(request, env) {
    await requireAdmin(request, env);
    const body = await readJson(request);

    const slug = String(body.slug || "").trim().toLowerCase();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const icon = String(body.icon || "").trim();
    const themeColor = String(body.theme_color || "#ffb7c5").trim();
    const assetKey = String(body.asset_key || "").trim();
    const externalUrl = String(body.external_url || "").trim();
    const kind = ["r2", "enisia", "external"].includes(body.kind) ? body.kind : "r2";

    if (!SLUG_RE.test(slug)) return jsonError("slug 格式无效(2-63位,小写字母/数字/-/_)", 400);
    if (!title) return jsonError("标题不能为空", 400);

    const existing = await findSiteBySlug(env.DB, slug);
    if (existing) return jsonError("该 slug 已被使用", 409);

    const result = await insertSite(env.DB, slug, title, description, icon, themeColor, assetKey, externalUrl, kind, 0);

    return json({
        ok: true,
        site: {
            id: result.meta?.last_row_id,
            slug, title, description, icon, theme_color: themeColor, asset_key: assetKey, external_url: externalUrl, kind,
        },
    });
}

export async function deleteSiteHandler(request, env, url, params) {
    await requireAdmin(request, env);
    const id = Number(params.id);
    if (!id) return jsonError("无效的站点 ID", 400);

    const site = await findSiteById(env.DB, id);
    if (!site) return jsonError("站点不存在", 404);

    await deleteSite(env.DB, id);
    return json({ ok: true, deleted: site.slug });
}

export async function updateSiteHandler(request, env, url, params) {
    await requireAdmin(request, env);
    const id = Number(params.id);
    if (!id) return jsonError("无效的站点 ID", 400);

    const body = await readJson(request);
    const fields = {};
    if (body.title !== undefined) fields.title = String(body.title).trim();
    if (body.description !== undefined) fields.description = String(body.description).trim();
    if (body.icon !== undefined) fields.icon = String(body.icon).trim();
    if (body.theme_color !== undefined) fields.theme_color = String(body.theme_color).trim();
    if (body.asset_key !== undefined) fields.asset_key = String(body.asset_key).trim();
    if (body.external_url !== undefined) fields.external_url = String(body.external_url).trim();
    if (body.kind !== undefined && ["r2", "enisia", "external"].includes(body.kind)) fields.kind = body.kind;
    if (body.sort_order !== undefined) fields.sort_order = Number(body.sort_order) || 0;
    if (body.enabled !== undefined) fields.enabled = body.enabled ? 1 : 0;

    if (!Object.keys(fields).length) return jsonError("没有要更新的字段", 400);

    await updateSite(env.DB, id, fields);
    return json({ ok: true });
}
