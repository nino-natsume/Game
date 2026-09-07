import { json, jsonError, readJson, html } from "../lib/http.js";
import {
    hashPassword, makeSession, makeCookie, SESSION_TTL_SECONDS, bytesToHex,
} from "../lib/crypto.js";
import {
    findUserByUsername, findUserByGithubId, usernameExists, insertUser, updateNickname,
    recordLoginAttempt, countLoginFailures, clearLoginFailures,
} from "../lib/db.js";
import { requireUser } from "../lib/session.js";

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAIL_PER_USER = 5;
const MAX_FAIL_PER_IP = 20;

function normalizeName(raw) {
    return String(raw || "").trim().toLowerCase();
}

function validateUsername(name) {
    return USERNAME_RE.test(name) ? null : "用户名需为 3-32 位字母、数字或下划线";
}

function clientIp(request) {
    return (
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        ""
    );
}

async function assertNotRateLimited(db, username, ip) {
    const since = Date.now() - RATE_WINDOW_MS;
    const [byUser, byIp] = await Promise.all([
        countLoginFailures(db, username, ip, since),
        countLoginFailures(db, "", ip, since),
    ]);
    const limit = Math.min(
        byUser >= MAX_FAIL_PER_USER ? MAX_FAIL_PER_USER : Infinity,
        byIp >= MAX_FAIL_PER_IP ? MAX_FAIL_PER_IP : Infinity
    );
    if (limit !== Infinity) {
        const err = new Error("尝试次数过多,请 15 分钟后再试");
        err.status = 429;
        err.retryAfter = Math.ceil(RATE_WINDOW_MS / 1000);
        throw err;
    }
}

function authedJson(data, token) {
    return json(
        { ok: true, ...data },
        200,
        { "set-cookie": makeCookie(token, SESSION_TTL_SECONDS) }
    );
}

// ---------------------------------------------------------------------------
//  远程用户中心代理(连接 enisia.107211.xyz 等已部署系统的用户系统)
// ---------------------------------------------------------------------------
async function proxyFetch(base, path, init) {
    try {
        const r = await fetch(base.replace(/\/+$/, "") + path, init);
        const data = await r.json().catch(() => ({}));
        return { status: r.status, data, headers: r.headers };
    } catch (e) {
        console.error("auth proxy error:", e);
        return null;
    }
}

async function proxyLoginRequest(base, username, password) {
    return proxyFetch(base, "/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
}

async function proxyRegisterRequest(base, username, password) {
    return proxyFetch(base, "/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
}

async function ensureLocalUser(env, username) {
    if (!(await usernameExists(env.DB, username))) {
        await insertUser(env.DB, username, "remote");
    }
}

// ---------------------------------------------------------------------------
//  注册
// ---------------------------------------------------------------------------
export async function register(request, env) {
    const body = await readJson(request);
    const name = normalizeName(body.username);
    const password = String(body.password || "");

    const nameErr = validateUsername(name);
    if (nameErr) return jsonError(nameErr, 400);
    if (password.length < 6) return jsonError("密码至少 6 位", 400);

    if (env.AUTH_PROXY_URL) {
        const res = await proxyRegisterRequest(env.AUTH_PROXY_URL, name, password);
        if (!res) return jsonError("用户中心连接失败", 502);
        if (res.status >= 500) return jsonError("用户中心暂时不可用,请稍后再试", 502);
        if (!res.data.ok || res.status >= 400) {
            return json(
                { ok: false, error: res.data.error || "注册失败" },
                res.status >= 400 && res.status < 500 ? res.status : 409
            );
        }
        await ensureLocalUser(env, name);
        const token = await makeSession(name, env.SESSION_SECRET, null);
        return authedJson({ username: name, nickname: name }, token);
    }

    if (await usernameExists(env.DB, name)) {
        return jsonError("该账号已存在", 409);
    }
    const passHash = await hashPassword(password, null);
    await insertUser(env.DB, name, passHash);

    const token = await makeSession(name, env.SESSION_SECRET, null);
    return authedJson({ username: name, nickname: name }, token);
}

// ---------------------------------------------------------------------------
//  登录
// ---------------------------------------------------------------------------
export async function login(request, env) {
    const body = await readJson(request);
    const name = normalizeName(body.username);
    const password = String(body.password || "");

    if (!name || !password) return jsonError("缺少账号或密码", 400);

    if (env.AUTH_PROXY_URL) {
        const res = await proxyLoginRequest(env.AUTH_PROXY_URL, name, password);
        if (!res) return jsonError("用户中心连接失败", 502);
        if (res.status === 429) {
            return jsonError(res.data.error || "尝试次数过多,请稍后再试", 429, {
                "retry-after": String(res.headers.get("retry-after") || 900),
            });
        }
        if (res.status >= 500) return jsonError("用户中心暂时不可用,请稍后再试", 502);
        if (!res.data.ok || res.status >= 400) {
            return json({ ok: false, error: res.data.error || "账号或密码错误" }, 401);
        }
        await ensureLocalUser(env, name);
        const token = await makeSession(name, env.SESSION_SECRET, null);
        return authedJson({ username: name, nickname: name }, token);
    }

    const ip = clientIp(request);
    try {
        await assertNotRateLimited(env.DB, name, ip);
    } catch (err) {
        return jsonError(err.message, err.status, { "retry-after": String(err.retryAfter) });
    }

    const row = await findUserByUsername(env.DB, name);
    if (!row || String(row.pass_hash).startsWith("remote") || String(row.pass_hash).startsWith("github")) {
        await recordLoginAttempt(env.DB, name, ip, false);
        return jsonError("账号或密码错误(GitHub 账号请用 GitHub 登录)", 401);
    }

    const [, saltHex] = String(row.pass_hash).split("$");
    const check = await hashPassword(password, saltHex);
    if (check !== row.pass_hash) {
        await recordLoginAttempt(env.DB, name, ip, false);
        return jsonError("账号或密码错误", 401);
    }

    await clearLoginFailures(env.DB, name, ip);
    const token = await makeSession(name, env.SESSION_SECRET, null);
    return authedJson({ username: name, nickname: row.nickname || name }, token);
}

// ---------------------------------------------------------------------------
//  登出 / 当前用户
// ---------------------------------------------------------------------------
export async function logout() {
    return json({ ok: true }, 200, { "set-cookie": makeCookie("", 0) });
}

export async function me(request, env) {
    const username = await requireUser(request, env);
    const first = await env.DB.prepare("SELECT MIN(created_at) AS first FROM users").first();
    const row = await findUserByUsername(env.DB, username);
    const nickname = row?.nickname || username;
    const isAdmin = !!row && !!first && first.first === row.created_at;
    return json({
        ok: true,
        username,
        nickname,
        displayName: nickname,
        isAdmin,
        github: !!(row && row.github_id),
    });
}

// ---------------------------------------------------------------------------
//  个人资料(自定义用户名/昵称)
// ---------------------------------------------------------------------------
export async function updateProfile(request, env) {
    const username = await requireUser(request, env);
    const body = await readJson(request);
    const nickname = String(body.nickname || body.displayName || "").trim();

    if (nickname.length < 1 || nickname.length > 24) {
        return jsonError("自定义用户名需为 1-24 个字符", 400);
    }
    await updateNickname(env.DB, username, nickname);
    return json({ ok: true, nickname });
}

// ---------------------------------------------------------------------------
//  修改密码
// ---------------------------------------------------------------------------
export async function changePassword(request, env) {
    const username = await requireUser(request, env);
    const body = await readJson(request);
    const oldPassword = String(body.oldPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!oldPassword) return jsonError("缺少当前密码", 400);
    if (newPassword.length < 6) return jsonError("新密码至少 6 位", 400);

    if (env.AUTH_PROXY_URL) {
        const loginRes = await proxyLoginRequest(env.AUTH_PROXY_URL, username, oldPassword);
        if (!loginRes) return jsonError("用户中心连接失败", 502);
        if (loginRes.status >= 500) return jsonError("用户中心暂时不可用,请稍后再试", 502);
        if (!loginRes.data.ok || loginRes.status >= 400) {
            return jsonError("当前密码不正确", 403);
        }
        const setCookie = loginRes.headers.get("set-cookie") || "";
        const res = await proxyFetch(env.AUTH_PROXY_URL, "/api/password", {
            method: "PUT",
            headers: {
                "content-type": "application/json",
                cookie: setCookie.split(";")[0],
            },
            body: JSON.stringify({ oldPassword, newPassword }),
        });
        if (!res) return jsonError("用户中心连接失败", 502);
        if (!res.data.ok || res.status >= 400) {
            return json(
                { ok: false, error: res.data.error || "修改失败" },
                res.status >= 400 && res.status < 500 ? res.status : 500
            );
        }
        return json({ ok: true }, 200, { "set-cookie": makeCookie("", 0) });
    }

    const row = await findUserByUsername(env.DB, username);
    if (!row) return jsonError("账号不存在", 404);
    if (String(row.pass_hash).startsWith("github")) {
        return jsonError("GitHub 账号请直接使用 GitHub 登录,无需设置密码", 400);
    }

    const [, saltHex] = String(row.pass_hash).split("$");
    const check = await hashPassword(oldPassword, saltHex);
    if (check !== row.pass_hash) return jsonError("当前密码不正确", 403);

    const newHash = await hashPassword(newPassword, null);
    await env.DB
        .prepare("UPDATE users SET pass_hash = ? WHERE username = ?")
        .bind(newHash, username)
        .run();

    return json({ ok: true }, 200, { "set-cookie": makeCookie("", 0) });
}

// ---------------------------------------------------------------------------
//  GitHub OAuth 登录
// ---------------------------------------------------------------------------
const GH_STATE_COOKIE = "gh_oauth_state";
const GH_STATE_MAX_AGE = 600;

function ghStateCookie(value) {
    return `${GH_STATE_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GH_STATE_MAX_AGE}`;
}

function ghStateClear() {
    return `${GH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function failurePage(title, message) {
    return html(`<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitHub 登录 - 失败</title>
<style>body{font-family:-apple-system,'Segoe UI','Noto Sans SC',sans-serif;background:#fcfcfc;color:#1f2937;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;}
.box{max-width:420px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center;box-shadow:0 10px 15px -3px rgba(0,0,0,.1);}
h1{font-size:20px;margin:0 0 10px;background:linear-gradient(135deg,#ffb7c5,#ff8fa3);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
p{color:#6b7280;font-size:14px;margin:0 0 20px;}
a{display:inline-block;padding:10px 22px;background:linear-gradient(135deg,#ffb7c5,#ff8fa3);color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;}</style>
</head>
<body><div class="box"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="/">返回主页</a></div></body>
</html>`, 400);
}

function escapeHtml(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function githubLogin(_request, env, url) {
    const clientId = env.GITHUB_CLIENT_ID;
    if (!clientId) {
        return jsonError("未配置 GitHub OAuth(client id)", 500);
    }
    const stateBytes = new Uint8Array(16);
    crypto.getRandomValues(stateBytes);
    const state = bytesToHex(stateBytes);

    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", url.origin + "/api/github/callback");
    authorize.searchParams.set("scope", "read:user");
    authorize.searchParams.set("state", state);

    return new Response(null, {
        status: 302,
        headers: {
            location: authorize.toString(),
            "set-cookie": ghStateCookie(state),
        },
    });
}

export async function githubCallback(request, env, url) {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookie = request.headers.get("cookie") || "";
    const seg = cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith(GH_STATE_COOKIE + "="));
    const stored = seg ? seg.slice(GH_STATE_COOKIE.length + 1) : null;

    if (!code || !state || !stored || state !== stored) {
        return failurePage("GitHub 登录失败", "安全校验未通过,请重新尝试。");
    }
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return failurePage("GitHub 登录失败", "服务端未配置 GitHub OAuth。");
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
        }),
    }).catch(() => null);
    if (!tokenRes) return failurePage("GitHub 登录失败", "连接 GitHub 失败,请稍后重试。");
    const tokenData = await tokenRes.json().catch(() => ({}));
    const accessToken = tokenData.access_token;
    if (!accessToken) return failurePage("GitHub 登录失败", "获取授权令牌失败,请重新尝试。");

    const userRes = await fetch("https://api.github.com/user", {
        headers: {
            authorization: "Bearer " + accessToken,
            accept: "application/json",
            "user-agent": "game-hub",
        },
    }).catch(() => null);
    if (!userRes || !userRes.ok) return failurePage("GitHub 登录失败", "获取 GitHub 用户信息失败。");
    const gh = await userRes.json().catch(() => ({}));
    const ghId = String(gh.id || "");
    if (!ghId) return failurePage("GitHub 登录失败", "未能识别 GitHub 账号。");

    let user = await findUserByGithubId(env.DB, ghId);
    let username;
    if (user) {
        username = user.username;
    } else {
        const ghLogin = String(gh.login || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32);
        let base = ghLogin || "gh_" + ghId;
        if (!/^[a-z0-9_]{3,32}$/.test(base)) base = "gh_" + ghId;
        let candidate = base;
        let i = 1;
        while (await usernameExists(env.DB, candidate)) candidate = base + "_" + (i++);
        username = candidate;
        const nickname = String(gh.name || gh.login || username).slice(0, 24);
        await insertUser(env.DB, username, "github:", nickname, ghId);
    }

    const token = await makeSession(username, env.SESSION_SECRET, null);
    return new Response(null, {
        status: 302,
        headers: {
            location: url.origin + "/",
            "set-cookie": [ghStateClear(), makeCookie(token, SESSION_TTL_SECONDS)],
        },
    });
}