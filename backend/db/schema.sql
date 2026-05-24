-- ============================================================
-- sekoplan データベーススキーマ（Supabase / PostgreSQL）
-- Supabase の SQL Editor でこのファイルを実行してください
-- ============================================================

-- ── ユーザーテーブル ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TEXT NOT NULL,
  updated_at    TEXT,
  deleted_at    TEXT
);

-- ── 施工計画書テーブル ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  filename        TEXT,
  file_path       TEXT,
  file_size       INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'completed',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  -- 主要フィールド（一覧表示・検索用）
  project_name    TEXT,
  project_type    TEXT,
  contract_number TEXT,
  location        TEXT,
  start_date      TEXT,
  end_date        TEXT,
  contract_amount TEXT,
  client          TEXT,
  contractor      TEXT,
  -- フォームデータ全体（JSON文字列として保存）
  full_data       TEXT
);

CREATE INDEX IF NOT EXISTS plans_user_id_idx ON plans (user_id);
CREATE INDEX IF NOT EXISTS plans_created_at_idx ON plans (created_at DESC);

-- ── テンプレートテーブル ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  original_filename TEXT,
  file_data_b64     TEXT,  -- base64エンコードされたDOCXファイル内容
  file_size         INTEGER DEFAULT 0,
  created_at        TEXT NOT NULL
);

-- ============================================================
-- RLS（Row Level Security）を無効化（サーバーサイド専用アクセス）
-- Service Role Key を使用する場合は RLS 不要
-- ============================================================
ALTER TABLE users     DISABLE ROW LEVEL SECURITY;
ALTER TABLE plans     DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
