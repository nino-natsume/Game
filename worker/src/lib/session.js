import { readCookieToken, verifySession } from "./crypto.js";

export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export async function requireUser(request, env) {
    const token = readCookieToken(request.headers.get("cookie") || "");
    const payload = token ? await verifySession(token, env.SESSION_SECRET) : null;
    if (!payload) {
        throw new HttpError(401, "未登录或会话已过期");
    }
    return payload.sub;
}
