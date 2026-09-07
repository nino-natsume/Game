export function matchRoute(routes, method, pathname) {
    for (const r of routes) {
        if (r.method !== "*" && r.method !== method) continue;

        if (typeof r.path === "string") {
            if (r.path === pathname) return { route: r, params: {} };
            if (r.path.includes(":")) {
                const params = matchParams(r.path, pathname);
                if (params !== null) return { route: r, params };
            }
        } else if (r.path && typeof r.path.prefix === "string") {
            if (pathname.startsWith(r.path.prefix)) return { route: r, params: {} };
        }
    }
    return null;
}

function matchParams(template, pathname) {
    const tParts = template.split("/");
    const pParts = pathname.split("/");
    if (tParts.length !== pParts.length) return null;
    const params = {};
    for (let i = 0; i < tParts.length; i++) {
        if (tParts[i].startsWith(":")) {
            params[tParts[i].slice(1)] = decodeURIComponent(pParts[i]);
        } else if (tParts[i] !== pParts[i]) {
            return null;
        }
    }
    return params;
}
