ALTER TABLE article_analysis ADD COLUMN category TEXT NOT NULL DEFAULT '기타';
CREATE INDEX IF NOT EXISTS idx_category ON article_analysis (category);
