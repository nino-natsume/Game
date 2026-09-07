CREATE TABLE IF NOT EXISTS login_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL DEFAULT '',
    ip         TEXT NOT NULL DEFAULT '',
    success    INTEGER NOT NULL DEFAULT 0,
    at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup
    ON login_attempts (username, ip, at);
