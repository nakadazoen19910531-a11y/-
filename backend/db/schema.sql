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

-- ── 過去事例テーブル ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS past_cases (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  project_type      TEXT DEFAULT '',
  client            TEXT DEFAULT '',
  location          TEXT DEFAULT '',
  year              TEXT DEFAULT '',
  original_filename TEXT,
  file_data_b64     TEXT,  -- base64エンコードされたDOCXファイル内容
  file_size         INTEGER DEFAULT 0,
  created_at        TEXT NOT NULL,
  uploaded_by       TEXT
);

CREATE INDEX IF NOT EXISTS past_cases_created_at_idx ON past_cases (created_at DESC);

-- ── 設計図書テーブル ──────────────────────────────────────────
-- 公共工事の設計図書（契約書・図面・仕様書・数量計算書等）を保管
-- 施工計画書作成の原典となる最重要資料
CREATE TABLE IF NOT EXISTS design_documents (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  document_type     TEXT DEFAULT '',  -- 図書種別: 契約図書/図面/仕様書/数量計算書/その他
  project_name      TEXT DEFAULT '',  -- 関連案件名
  client            TEXT DEFAULT '',
  location          TEXT DEFAULT '',
  year              TEXT DEFAULT '',
  original_filename TEXT,
  mime_type         TEXT DEFAULT 'application/octet-stream',
  file_data_b64     TEXT,  -- base64エンコードされたファイル内容（PDF/DOCX/XLSX/ZIP対応）
  file_size         INTEGER DEFAULT 0,
  created_at        TEXT NOT NULL,
  uploaded_by       TEXT
);

CREATE INDEX IF NOT EXISTS design_documents_created_at_idx ON design_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS design_documents_project_name_idx ON design_documents (project_name);

-- ============================================================
-- RLS（Row Level Security）を無効化（サーバーサイド専用アクセス）
-- Service Role Key を使用する場合は RLS 不要
-- ============================================================
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE plans            DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates        DISABLE ROW LEVEL SECURITY;
ALTER TABLE past_cases       DISABLE ROW LEVEL SECURITY;
ALTER TABLE design_documents DISABLE ROW LEVEL SECURITY;
