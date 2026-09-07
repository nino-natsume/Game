import { json, jsonError, readJson } from "../lib/http.js";
import {
    hashPassword, makeSession, makeCookie, SESSION_TTL_SECONDS,
} from "../lib/crypto.js";
import {
    findUserByUsername, usernameExists, insertUser,
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
        return authedJson({ username: name }, token);
    }

    if (await usernameExists(env.DB, name)) {
        return jsonError("该账号已存在", 409);
    }
    const passHash = await hashPassword(password, null);
    await insertUser(env.DB, name, passHash);

    const token = await makeSession(name, env.SESSION_SECRET, null);
    return authedJson({ username: name }, token);
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
            return jsonError(res.data.error || "尝试次数过多，请稍后再试", 429, {
                "retry-after": String(res.headers.get("retry-after") || 900),
            });
        }
        if (res.status >= 500) return jsonError("用户中心暂时不可用,请稍后再试", 502);
        if (!res.data.ok || res.status >= 400) {
            return json({ ok: false, error: res.data.error || "账号或密码错误" }, 401);
        }
        await ensureLocalUser(env, name);
        const token = await makeSession(name, env.SESSION_SECRET, null);
        return authedJson({ username: name }, token);
    }

    const ip = clientIp(request);
    try {
        await assertNotRateLimited(env.DB, name, ip);
    } catch (err) {
        return jsonError(err.message, err.status, { "retry-after": String(err.retryAfter) });
    }

    const row = await findUserByUsername(env.DB, name);
    if (!row || String(row.pass_hash).startsWith("remote")) {
        await recordLoginAttempt(env.DB, name, ip, false);
        return jsonError("账号或密码错误", 401);
    }

    const [, saltHex] = String(row.pass_hash).split("$");
    const check = await hashPassword(password, saltHex);
    if (check !== row.pass_hash) {
        await recordLoginAttempt(env.DB, name, ip, false);
        return jsonError("账号或密码错误", 401);
    }

    await clearLoginFailures(env.DB, name, ip);
    const token = await makeSession(name, env.SESSION_SECRET, null);
    return authedJson({ username: name }, token);
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
    const mine = await env.DB.prepare("SELECT created_at FROM users WHERE username = ?").bind(username).first();
    const isAdmin = !!mine && !!first && first.first === mine.created_at;
    return json({ ok: true, username, isAdmin });
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