import { initSchema, listSites } from "./lib/db.js";
import { matchRoute } from "./lib/router.js";
import { jsonError, corsHeaders, html, SECURITY_HEADERS } from "./lib/http.js";
import { HttpError, requireUser } from "./lib/session.js";

import { register, login, logout, me, changePassword } from "./handlers/auth.js";
import { listSitesHandler, createSiteHandler, deleteSiteHandler, updateSiteHandler } from "./handlers/sites.js";
import { getSave, putSave, getSiteSave, putSiteSave } from "./handlers/save.js";
import { serveEnisiaAsset, serveEnisiaAny, serveSlugAsset } from "./handlers/assets.js";
import { dashboardHtml, loginPageHtml, profilePageHtml, adminPageHtml, enisiaGamePageHtml, gamePageHtml } from "./handlers/pages.js";

async function isFirstUser(env, username) {
    const first = await env.DB.prepare("SELECT MIN(created_at) AS first FROM users").first();
    const mine = await env.DB.prepare("SELECT created_at FROM users WHERE username = ?").bind(username).first();
    return !!first && !!mine && first.first === mine.created_at;
}

async function optionalUser(request, env) {
    try {
        return await requireUser(request, env);
    } catch {
        return null;
    }
}

async function dashboardHandler(request, env, url) {
    const username = await optionalUser(request, env);
    const isAdmin = username ? await isFirstUser(env, username) : false;
    const sites = await listSites(env.DB);
    return html(dashboardHtml(env, url, username, isAdmin, sites), 200, { "cache-control": "no-store" });
}

function loginHandler(_req, env, url) {
    return html(loginPageHtml(env, url), 200, { "cache-control": "no-store" });
}

async function profileHandler(request, env, url) {
    try {
        const username = await requireUser(request, env);
        const isAdmin = await isFirstUser(env, username);
        const row = await env.DB.prepare("SELECT created_at FROM users WHERE username = ?").bind(username).first();
        return html(profilePageHtml(env, url, username, row?.created_at || null, isAdmin), 200, { "cache-control": "no-store" });
    } catch (err) {
        if (err instanceof HttpError && err.status === 401) {
            return Response.redirect(url.origin + "/login", 302);
        }
        throw err;
    }
}

async function adminHandler(request, env, url) {
    try {
        const username = await requireUser(request, env);
        if (!(await isFirstUser(env, username))) {
            return html("<h1>403 Forbidden</h1><p>需要管理员权限</p><a href='/'>返回主页</a>", 403);
        }
        const result = await env.DB.prepare(
            "SELECT id, slug, title, description, icon, theme_color, asset_key, external_url, kind, sort_order, enabled, created_at FROM sites ORDER BY sort_order ASC, created_at ASC"
        ).all();
        return html(adminPageHtml(env, url, username, result.results || []), 200, { "cache-control": "no-store" });
    } catch (err) {
        if (err instanceof HttpError && err.status === 401) {
            return Response.redirect(url.origin + "/login", 302);
        }
        throw err;
    }
}

async function playHandler(request, env, url, params) {
    try {
        const username = await requireUser(request, env);
        const site = await env.DB.prepare(
            "SELECT slug, title, description, theme_color, external_url, kind FROM sites WHERE slug = ? AND enabled = 1"
        ).bind(params.slug).first();
        if (!site) return html("<h1>404 站点不存在</h1><a href='/'>返回主页</a>", 404);
        if (site.kind === "external") {
            return Response.redirect(site.external_url || "/", 302);
        }
        if (site.kind === "enisia") {
            return html(enisiaGamePageHtml(env, url, username, site), 200, { "cache-control": "no-store" });
        }
        return html(gamePageHtml(env, url, username, site), 200, { "cache-control": "no-store" });
    } catch (err) {
        if (err instanceof HttpError && err.status === 401) {
            return Response.redirect(url.origin + "/", 302);
        }
        throw err;
    }
}

const RESERVED = new Set(["api", "login", "me", "admin", "assets", "site", "favicon.ico", "robots.txt"]);

const routes = [
    { method: "POST", path: "/api/register", handler: register },
    { method: "POST", path: "/api/login", handler: login },
    { method: "POST", path: "/api/logout", handler: logout },
    { method: "PUT", path: "/api/password", handler: changePassword },
    { method: "GET", path: "/api/me", handler: me },

    { method: "GET", path: "/api/sites", handler: listSitesHandler },
    { method: "POST", path: "/api/sites", handler: createSiteHandler },
    { method: "PUT", path: "/api/sites/:id", handler: updateSiteHandler },
    { method: "DELETE", path: "/api/sites/:id", handler: deleteSiteHandler },
    { method: "GET", path: "/api/sites/:slug/save", handler: getSiteSave },
    { method: "PUT", path: "/api/sites/:slug/save", handler: putSiteSave },

    { method: "GET", path: "/enisia/api/save", handler: getSave },
    { method: "PUT", path: "/enisia/api/save", handler: putSave },

    { method: "GET", path: "/", handler: dashboardHandler },
    { method: "GET", path: "/login", handler: loginHandler },
    { method: "GET", path: "/me", handler: profileHandler },
    { method: "GET", path: "/admin", handler: adminHandler },

    {
        method: "GET",
        path: { prefix: "/enisia/assets/" },
        handler: (req, env, url) => serveEnisiaAsset(url.pathname, env),
    },
    {
        method: "GET",
        path: { prefix: "/enisia/" },
        handler: async (req, env, url) => {
            const rest = url.pathname.slice("/enisia/".length);
            if (!rest) return playHandler(req, env, url, { slug: "enisia" });
            const resp = await serveEnisiaAny(url.pathname, env);
            return resp;
        },
    },
    {
        method: "*",
        path: { prefix: "/" },
        handler: async (req, env, url) => {
            const parts = url.pathname.split("/").filter(Boolean);
            const seg = parts[0];
            if (!seg || RESERVED.has(seg)) return null;

            if (parts[1] === "assets") {
                return serveSlugAsset(url.pathname, env, seg);
            }

            if (parts[1] === "api" && parts[2] === "save" && parts.length === 3) {
                return req.method === "GET"
                    ? getSiteSave(req, env, url, { slug: seg })
                    : putSiteSave(req, env, url, { slug: seg });
            }

            return playHandler(req, env, url, { slug: seg });
        },
    },
];

function errorResponse(err) {
    if (err instanceof HttpError) return jsonError(err.message, err.status);
    console.error("Unhandled error:", err && (err.stack || err.message || err));
    return jsonError("Internal Server Error", 500);
}

const CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: http: https:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");

function isHtmlPage(pathname) {
    if (["/", "/login", "/me", "/admin"].includes(pathname)) return true;
    return /^\/[^/]+$/.test(pathname);
}

function withSecurityHeaders(response, pathname) {
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
    if (isHtmlPage(pathname)) headers.set("content-security-policy", CSP);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }

        await initSchema(env.DB);

        const result = matchRoute(routes, request.method, url.pathname);
        if (!result) return withSecurityHeaders(jsonError("Not Found", 404), url.pathname);

        try {
            const response = await result.route.handler(request, env, url, result.params);
            if (!response) return withSecurityHeaders(jsonError("Not Found", 404), url.pathname);
            return withSecurityHeaders(response, url.pathname);
        } catch (err) {
            return withSecurityHeaders(errorResponse(err), url.pathname);
        }
    },

    async scheduled(_event, env) {
        await initSchema(env.DB);
    },

    routes,
};