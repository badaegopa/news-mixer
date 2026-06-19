CREATE TABLE IF NOT EXISTS article_analysis (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  url         TEXT    NOT NULL,
  press_name  TEXT,
  keywords    TEXT,   -- JSON array
  gaps        TEXT,   -- JSON array
  analyzed_at TEXT    NOT NULL,
  scope       TEXT    NOT NULL  -- '국내' | '국제'
);

CREATE INDEX IF NOT EXISTS idx_analyzed_at ON article_analysis (analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_scope       ON article_analysis (scope);
