let schemaInitialized = false;

const SCHEMA_SITES = `
CREATE TABLE IF NOT EXISTS sites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon        TEXT NOT NULL DEFAULT '',
    theme_color TEXT NOT NULL DEFAULT '#ffb7c5',
    asset_key   TEXT NOT NULL DEFAULT '',
    external_url TEXT NOT NULL DEFAULT '',
    kind        TEXT NOT NULL DEFAULT 'r2',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    enabled     INTEGER NOT NULL DEFAULT 1,
    created_at  INTEGER NOT NULL
);`;

export async function initSchema(db) {
    if (schemaInitialized) return;
    try {
        await db.prepare(SCHEMA_SITES).run();
        await seedEnisia(db);
    } finally {
        schemaInitialized = true;
    }
}

export function _resetSchemaFlag() {
    schemaInitialized = false;
}

export async function seedEnisia(db) {
    const row = await db.prepare("SELECT id FROM sites WHERE slug = 'enisia'").first();
    if (row) return;
    await db.prepare(
        "INSERT INTO sites (slug, title, description, icon, theme_color, asset_key, external_url, kind, sort_order, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)"
    ).bind(
        "enisia",
        "艾妮希雅与契约纹",
        "在浏览器中直接游玩的 RPG 云游戏,账号云端存档。",
        "/enisia/assets/icon/icon.png",
        "#ffb7c5",
        "",
        "",
        "enisia",
        Date.now()
    ).run();
}

export async function findUserByUsername(db, username) {
    return db
        .prepare("SELECT username, pass_hash FROM users WHERE username = ?")
        .bind(username)
        .first();
}

export async function usernameExists(db, username) {
    const row = await db
        .prepare("SELECT username FROM users WHERE username = ?")
        .bind(username)
        .first();
    return !!row;
}

export async function insertUser(db, username, passHash) {
    return db
        .prepare("INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)")
        .bind(username, passHash, Date.now())
        .run();
}

export async function countUsers(db) {
    const row = await db.prepare("SELECT COUNT(*) AS n FROM users").first();
    return row ? Number(row.n || 0) : 0;
}

export async function recordLoginAttempt(db, username, ip, success) {
    return db
        .prepare("INSERT INTO login_attempts (username, ip, success, at) VALUES (?, ?, ?, ?)")
        .bind(username, ip, success ? 1 : 0, Date.now())
        .run();
}

export async function countLoginFailures(db, username, ip, since) {
    const row = await db
        .prepare(
            `SELECT COUNT(*) AS n FROM login_attempts
             WHERE success = 0 AND at >= ?
               AND (? = '' OR username = ?)
               AND (? = '' OR ip = ?)`
        )
        .bind(since, username, username, ip, ip)
        .first();
    return row ? Number(row.n || 0) : 0;
}

export async function clearLoginFailures(db, username, ip) {
    return db
        .prepare("DELETE FROM login_attempts WHERE username = ? OR ip = ?")
        .bind(username, ip)
        .run();
}

export async function listSites(db) {
    return db
        .prepare("SELECT id, slug, title, description, icon, theme_color, asset_key, external_url, kind, sort_order, enabled, created_at FROM sites WHERE enabled = 1 ORDER BY sort_order ASC, created_at ASC")
        .all()
        .then((r) => r.results || []);
}

export async function listAllSites(db) {
    return db
        .prepare("SELECT id, slug, title, description, icon, theme_color, asset_key, external_url, kind, sort_order, enabled, created_at FROM sites ORDER BY sort_order ASC, created_at ASC")
        .all()
        .then((r) => r.results || []);
}

export async function findSiteBySlug(db, slug) {
    return db
        .prepare("SELECT id, slug, title, description, icon, theme_color, asset_key, external_url, kind, sort_order, enabled FROM sites WHERE slug = ?")
        .bind(slug)
        .first();
}

export async function findSiteById(db, id) {
    return db
        .prepare("SELECT id, slug, title, description, icon, theme_color, asset_key, external_url, kind, sort_order, enabled FROM sites WHERE id = ?")
        .bind(id)
        .first();
}

export async function insertSite(db, slug, title, description, icon, themeColor, assetKey, externalUrl, kind, sortOrder) {
    return db
        .prepare("INSERT INTO sites (slug, title, description, icon, theme_color, asset_key, external_url, kind, sort_order, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)")
        .bind(slug, title, description, icon, themeColor, assetKey, externalUrl || "", kind || "r2", sortOrder || 0, Date.now())
        .run();
}

export async function deleteSite(db, id) {
    return db.prepare("DELETE FROM sites WHERE id = ?").bind(id).run();
}

export async function updateSite(db, id, fields) {
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) {
            sets.push(`${k} = ?`);
            vals.push(v);
        }
    }
    if (!sets.length) return;
    vals.push(id);
    return db.prepare(`UPDATE sites SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
}