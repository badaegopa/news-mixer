CREATE TABLE IF NOT EXISTS feedback (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  url           TEXT    NOT NULL,
  feedback_type TEXT    NOT NULL CHECK(feedback_type IN ('trust','neutral','distrust')),
  count         INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL,
  UNIQUE(url, feedback_type)
);
CREATE INDEX IF NOT EXISTS idx_feedback_url  ON feedback (url);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback (feedback_type);
