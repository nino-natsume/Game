CREATE TABLE IF NOT EXISTS sites (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slug         TEXT NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    icon         TEXT NOT NULL DEFAULT '',
    theme_color  TEXT NOT NULL DEFAULT '#ffb7c5',
    asset_key    TEXT NOT NULL DEFAULT '',
    external_url TEXT NOT NULL DEFAULT '',
    kind         TEXT NOT NULL DEFAULT 'r2',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    enabled      INTEGER NOT NULL DEFAULT 1,
    created_at   INTEGER NOT NULL
);