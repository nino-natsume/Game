CREATE TABLE IF NOT EXISTS users (
    username   TEXT PRIMARY KEY,
    pass_hash  TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
