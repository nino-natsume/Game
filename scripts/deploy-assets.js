#!/usr/bin/env node
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { cpSync, rmSync, mkdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
    const opts = { slug: null, source: null, remote: null, dryRun: false, keep: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--slug") opts.slug = argv[++i];
        else if (a === "--source") opts.source = argv[++i];
        else if (a === "--remote") opts.remote = argv[++i];
        else if (a === "--dry-run") opts.dryRun = true;
        else if (a === "--keep") opts.keep = true;
        else if (a === "--help" || a === "-h") {
            console.log("用法: node scripts/deploy-assets.js --slug <slug> --source <dir> [--remote rclone:bucket] [--dry-run] [--keep]");
            process.exit(0);
        }
    }
    return opts;
}

function refreshPathForChildProcess() {
    if (process.platform !== "win32") return;
    try {
        const { execFileSync } = require("node:child_process");
        const out = execFileSync(
            "powershell",
            ["-NoProfile", "-Command", "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"],
            { encoding: "utf8", windowsHide: true }
        ).trim();
        if (out) process.env.PATH = out + ";" + (process.env.PATH || "");
    } catch {}
}

const NEEDED = [
    "css", "js", "data", "dataEx", "effects", "Fonts",
    "icon", "img", "Audio", "Movies", "Mod", "Dictionaries",
];

function sizeOf(dir) {
    let total = 0;
    const walk = (d) => {
        for (const entry of require("node:fs").readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, entry.name);
            if (entry.isDirectory()) walk(p);
            else total += statSync(p).size;
        }
    };
    walk(dir);
    return total;
}

function countFiles(dir) {
    let n = 0;
    const walk = (d) => {
        for (const entry of require("node:fs").readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, entry.name);
            if (entry.isDirectory()) walk(p);
            else n++;
        }
    };
    walk(dir);
    return n;
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    refreshPathForChildProcess();
    if (!opts.slug) { console.error("必须指定 --slug"); process.exit(1); }
    if (!opts.source) { console.error("必须指定 --source"); process.exit(1); }

    const slug = opts.slug;
    const remote = opts.remote || `cfr2:hub-site-${slug}-assets`;
    const source = path.resolve(opts.source);
    const staging = path.join(__dirname, "..", "_staging", slug);

    console.log(`站点: ${slug}`);
    console.log(`源目录: ${source}`);
    console.log(`目标: ${remote}`);
    if (!existsSync(source)) { console.error("找不到游戏目录: " + source); process.exit(1); }

    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });
    for (const item of NEEDED) {
        const src = path.join(source, item);
        if (existsSync(src)) {
            cpSync(src, path.join(staging, item), { recursive: true });
            console.log(`已复制: ${item}`);
        } else {
            console.warn(`缺少(跳过): ${item}`);
        }
    }

    const pluginSrc = path.join(__dirname, "..", "plugin", "CloudSave.js");
    const pluginDest = path.join(staging, "js", "plugins", "CloudSave.js");
    if (existsSync(pluginSrc)) {
        mkdirSync(path.dirname(pluginDest), { recursive: true });
        cpSync(pluginSrc, pluginDest);
        console.log("已注入插件: js/plugins/CloudSave.js");
    } else {
        console.error("找不到插件文件: " + pluginSrc);
        process.exit(1);
    }

    const mb = (sizeOf(staging) / 1024 / 1024).toFixed(1);
    console.log(`资源总数: ${countFiles(staging)} 个文件, ${mb} MB`);

    if (opts.dryRun) {
        console.log(`dry-run: rclone copy "${staging}" "${remote}" --transfers 32 --checkers 64 --progress`);
        if (!opts.keep) { rmSync(staging, { recursive: true, force: true }); console.log("已清理暂存目录"); }
        return;
    }

    if (spawnSync("rclone", ["--version"], { stdio: "ignore" }).status !== 0) {
        console.error("未检测到 rclone,请先安装: winget install Rclone.Rclone");
        process.exit(1);
    }
    const r = spawnSync("rclone", [
        "copy", staging, remote,
        "--transfers", "32", "--checkers", "64", "--progress", "--fast-list", "--s3-chunk-size", "128M",
    ], { stdio: "inherit" });
    if (r.status !== 0) { console.error("rclone 上传失败"); process.exit(r.status || 1); }
    console.log("上传完成");
    if (!opts.keep) { rmSync(staging, { recursive: true, force: true }); console.log("已清理暂存目录"); }
}

main();