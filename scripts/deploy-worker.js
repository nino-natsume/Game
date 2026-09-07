#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const WORKER_DIR = path.join(REPO_ROOT, "worker");
const GENERATED_CFG = "wrangler.generated.toml";
const ASSET_BUCKET = "enisia-game-assets";
const D1_NAME = "enisia-users";

function has(cmd) {
    return spawnSync(cmd, ["--version"], { stdio: "ignore" }).status === 0;
}

function run(label, args, cwd = WORKER_DIR) {
    console.log(`== ${label}`);
    const r = spawnSync("wrangler", args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    return r.status === 0;
}

function findD1Id() {
    const r = spawnSync("wrangler", ["d1", "list", "--json"], { cwd: WORKER_DIR, encoding: "utf8", shell: process.platform === "win32" });
    if (r.status !== 0) return null;
    try {
        const list = JSON.parse(r.stdout);
        const row = list.find((x) => x.name === D1_NAME);
        return row ? row.database_id || row.uuid || null : null;
    } catch {
        const m = r.stdout.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32}/i);
        return m ? m[0] : null;
    }
}

function main() {
    const doDeploy = process.argv.includes("--deploy");
    if (!has("wrangler")) { console.error("未找到 wrangler,请先安装: npm i -g wrangler"); process.exit(1); }
    if (!existsSync(path.join(WORKER_DIR, "wrangler.toml"))) { console.error("找不到 worker/wrangler.toml"); process.exit(1); }

    run("创建/确认 R2 bucket: " + ASSET_BUCKET, ["r2", "bucket", "create", ASSET_BUCKET]);
    run("创建/确认 D1: " + D1_NAME, ["d1", "create", D1_NAME]);

    const d1Id = findD1Id();
    if (!d1Id) { console.error("自动查找 D1 database_id 失败"); process.exit(1); }
    console.log(`D1 database_id: ${d1Id}`);

    const gen = spawnSync("node", [path.join(REPO_ROOT, "scripts", "prepare-wrangler.js"), "--d1-id", d1Id, "--out", GENERATED_CFG], { cwd: WORKER_DIR, stdio: "inherit", shell: process.platform === "win32" });
    if (gen.status !== 0) process.exit(1);

    console.log("下一步:");
    console.log("  1) cd worker && wrangler secret put SESSION_SECRET");
    console.log(`  2) cd worker && wrangler deploy -c ${GENERATED_CFG}`);
    console.log("  3) 访问 /admin 添加站点,创建 R2 bucket,上传资源");

    if (doDeploy) {
        if (!run("wrangler deploy", ["deploy", "-c", GENERATED_CFG])) process.exit(1);
        console.log("部署成功");
    }
}

main();