#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const WORKER_DIR = path.join(ROOT, "worker");
const TEMPLATE = path.join(WORKER_DIR, "wrangler.toml");
const DEFAULT_OUT = path.join(WORKER_DIR, "wrangler.generated.toml");
const D1_NAME = "enisia-users";
const PLACEHOLDERS = ["__D1_DATABASE_ID__", "PASTE_YOUR_D1_DATABASE_ID_HERE"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseArgs(argv) {
    const opts = { d1Id: null, out: DEFAULT_OUT, auto: false, check: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--d1-id") opts.d1Id = argv[++i];
        else if (a === "--out") opts.out = argv[++i];
        else if (a === "--auto") opts.auto = true;
        else if (a === "--check") opts.check = true;
        else if (a === "--help" || a === "-h") process.exit(0);
    }
    return opts;
}

function findD1IdIn(payload) {
    const walk = (node) => {
        if (!node || typeof node !== "object") return null;
        if (Array.isArray(node)) {
            for (const item of node) { const r = walk(item); if (r) return r; }
            return null;
        }
        if (node.name === D1_NAME) return node.database_id || node.uuid || node.id || null;
        for (const v of Object.values(node)) { const r = walk(v); if (r) return r; }
        return null;
    };
    return walk(payload);
}

function findD1IdByWrangler() {
    const r = spawnSync("wrangler", ["d1", "list", "--json"], { encoding: "utf8", shell: process.platform === "win32" });
    if (r.status !== 0) {
        const plain = spawnSync("wrangler", ["d1", "list"], { encoding: "utf8", shell: process.platform === "win32" });
        const out = plain.status === 0 ? plain.stdout : "";
        const m = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32}/i);
        if (m) return m[0];
        return null;
    }
    try {
        const id = findD1IdIn(JSON.parse(r.stdout));
        if (id) return id;
    } catch {}
    const m = r.stdout.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32}/i);
    return m ? m[0] : null;
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    if (!existsSync(TEMPLATE)) { console.error("找不到模板: " + TEMPLATE); process.exit(1); }

    let d1Id = opts.d1Id || null;
    if (!d1Id && opts.auto) d1Id = findD1IdByWrangler();
    if (!d1Id) { console.error("未指定 D1 database_id"); process.exit(1); }
    if (!UUID_RE.test(d1Id)) { console.error("database_id 不是合法 UUID: " + d1Id); process.exit(1); }

    let text = readFileSync(TEMPLATE, "utf8");
    let replaced = false;
    for (const ph of PLACEHOLDERS) {
        if (text.includes(ph)) {
            text = text.split(ph).join(d1Id);
            replaced = true;
            break;
        }
    }
    if (!replaced) {
        const m = text.match(/database_id\s*=\s*"([^"]+)"/);
        if (m && UUID_RE.test(m[1])) { console.log("模板已有 database_id: " + m[1]); process.exit(0); }
        console.error("模板里找不到占位符"); process.exit(1);
    }

    const out = path.resolve(opts.out);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, text, "utf8");
    console.log("已生成配置: " + out);
    console.log("d1 database_id = " + d1Id);
}

main();