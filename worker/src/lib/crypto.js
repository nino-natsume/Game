const SESSION_COOKIE = "hub_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function bytesToHex(bytes) {
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        out[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return out;
}

function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

async function deriveKey(secret) {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode("hub key v1:" + secret)
    );
    return new Uint8Array(digest);
}

async function hmacSHA256Hex(keyBytes, message) {
    const key = await crypto.subtle.importKey(
        "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    return bytesToHex(new Uint8Array(sig));
}

export async function makeSession(username, secret, issuerHost) {
    const payload = {
        sub: username,
        iss: issuerHost || "gamehub",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const payloadB64 = b64urlEncode(JSON.stringify(payload));
    const keyBytes = await deriveKey(secret);
    const sig = await hmacSHA256Hex(keyBytes, payloadB64);
    return `${payloadB64}.${sig}`;
}

export async function verifySession(token, secret) {
    if (!token) return null;
    const idx = token.lastIndexOf(".");
    if (idx <= 0) return null;
    const payloadB64 = token.slice(0, idx);
    const sig = token.slice(idx + 1);
    const keyBytes = await deriveKey(secret);
    const expect = await hmacSHA256Hex(keyBytes, payloadB64);
    if (expect !== sig) return null;
    try {
        const payload = JSON.parse(b64urlDecode(payloadB64));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

export function makeCookie(value, maxAgeSeconds, path = "/") {
    const parts = [
        `${SESSION_COOKIE}=${value}`,
        `Path=${path}`,
        `Max-Age=${maxAgeSeconds}`,
        "HttpOnly",
        "SameSite=Lax",
    ];
    if (maxAgeSeconds <= 0) {
        parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    }
    return parts.join("; ");
}

export function readCookieToken(cookieHeader) {
    if (!cookieHeader) return null;
    const seg = cookieHeader
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith(SESSION_COOKIE + "="));
    return seg ? seg.slice(SESSION_COOKIE.length + 1) : null;
}

export async function hashPassword(password, saltHex) {
    const salt = saltHex
        ? hexToBytes(saltHex)
        : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
    );
    const hashHex = bytesToHex(new Uint8Array(bits));
    const saltHexOut = bytesToHex(salt);
    return `pbkdf2$${saltHexOut}$${hashHex}`;
}
