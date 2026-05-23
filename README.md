# 施工計画書自動作成システム - Next.js + Flask フルスタック

Next.js フロントエンドと Python Flask バックエンドを統合した、公共工事の施工計画書を効率的に自動作成するシステムです。

## 🏗️ プロジェクト構造

```
sekoplan-next-flask/
├── frontend/                    # Next.js 14+ React アプリケーション
│   ├── pages/                  # ページコンポーネント
│   ├── components/             # React コンポーネント
│   ├── contexts/               # React Context (認証など)
│   ├── hooks/                  # カスタム React hooks
│   ├── styles/                 # グローバルスタイル
│   ├── lib/                    # ユーティリティ関数
│   ├── public/                 # 静的ファイル
│   ├── package.json            # フロントエンド依存関係
│   ├── tsconfig.json           # TypeScript 設定
│   ├── tailwind.config.ts      # Tailwind CSS 設定
│   ├── next.config.js          # Next.js 設定
│   └── .env.local              # 環境変数
│
└── backend/                     # Python Flask REST API
    ├── routes/                 # API ルート定義
    │   ├── auth.py            # 認証エンドポイント
    │   ├── plans.py           # 施工計画書エンドポイント
    │   ├── pdf.py             # PDF処理エンドポイント
    │   └── health.py          # ヘルスチェック
    ├── services/              # ビジネスロジック
    │   ├── plan_service.py    # 施工計画書管理
    │   ├── pdf_service.py     # PDF処理
    │   └── document_service.py # DOCX生成
    ├── config/                # 設定管理
    │   ├── base.py           # 基本設定
    │   ├── development.py    # 開発環境設定
    │   ├── production.py     # 本番環境設定
    │   └── testing.py        # テスト環境設定
    ├── app.py                 # Flask アプリケーションファクトリ
    ├── requirements.txt       # Python 依存関係
    ├── .env.example          # 環境変数テンプレート
    └── README.md             # バックエンド README
```

## 🚀 クイックスタート

### 前提条件

- Node.js 18+ (フロントエンド)
- Python 3.10+ (バックエンド)
- npm または yarn (フロントエンド)

### フロントエンド セットアップ

```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

### バックエンド セットアップ

```bash
# バックエンドディレクトリに移動
cd backend

# 仮想環境を作成
python -m venv venv

# 仮想環境を有効化 (Windows)
venv\Scripts\activate

# 仮想環境を有効化 (macOS/Linux)
source venv/bin/activate

# 依存関係をインストール
pip install -r requirements.txt

# .env ファイルを作成
cp .env.example .env

# 開発サーバーを起動
python app.py
```

バックエンドは `http://localhost:5000` で起動します。

## 🔧 設定

### フロントエンド環境変数 (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_AUTH_ENABLED=true
NEXT_PUBLIC_APP_NAME=施工計画書自動作成システム
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### バックエンド環境変数 (.env)

```env
FLASK_ENV=development
FLASK_DEBUG=true
FLASK_PORT=5000
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
CORS_ORIGINS=http://localhost:3000
DATABASE_URL=sqlite:///instance/app.db
LOG_LEVEL=INFO
```

## 📋 主な機能

### フロントエンド（Next.js 14+ React）

- **SPA（Single Page Application）**: クライアント側でのルーティング
- **認証フロー**: Login → Register → JWT トークン管理
- **施工計画書作成ウィザード**:
  1. NotebookLM テキスト入力
  2. PDF 設計図書アップロード
  3. データ確認・編集
  4. DOCX 生成・ダウンロード
- **過去の作成履歴**: 生成済みファイルの一覧表示・ダウンロード
- **NotebookLM 連携**: リンク共有機能

### バックエンド（Flask REST API）

- **認証エンドポイント** (`/api/auth/*`):
  - ログイン、登録、トークン更新
  
- **施工計画書エンドポイント** (`/api/plans/*`):
  - 新規作成、取得、一覧表示、削除、ダウンロード
  
- **PDF 処理エンドポイント** (`/api/pdf/*`):
  - テキスト抽出、データ解析
  
- **DOCX 生成**:
  - 既存テンプレート活用
  - python-docx による動的フィールド入力

## 🔌 API エンドポイント

### 認証 (`POST /api/auth/*`)

```bash
# ログイン
POST /api/auth/login
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "password"
}

# レスポンス
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "...",
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user"
  }
}
```

### 施工計画書 (`GET/POST /api/plans/*`)

```bash
# 施工計画書生成
POST /api/plans/generate
Authorization: Bearer <token>
Content-Type: application/json
{
  "projectName": "公園樹木せん定等委託",
  "projectType": "造園工事",
  "contractNumber": "R8-23762",
  "location": "渋谷区内全域",
  "startDate": "令和8年4月1日",
  "endDate": "令和9年3月31日",
  "contractAmount": "¥5,000,000",
  "client": "渋谷区",
  "contractor": "中田造園株式会社"
}

# レスポンス
{
  "status": "success",
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "公園樹木せん定等委託_施工計画書_20260523_085101.docx",
  "download_url": "/api/plans/550e8400-e29b-41d4-a716-446655440000/download"
}
```

### PDF 処理 (`POST /api/pdf/*`)

```bash
# PDF からデータ抽出
POST /api/pdf/extract
Authorization: Bearer <token>
Content-Type: multipart/form-data
files: <PDF file>

# レスポンス
{
  "status": "success",
  "extracted_data": {
    "contractNumber": "R8-23762",
    "location": "渋谷区内全域",
    "startDate": "2026年4月1日",
    "endDate": "2027年3月31日",
    "contractAmount": "¥5,000,000"
  }
}
```

## 📦 フロントエンド技術スタック

- **Next.js 14+**: モダン React フレームワーク
- **React 18+**: UI ライブラリ
- **TypeScript**: 型安全性
- **Tailwind CSS**: ユーティリティファーストCSS
- **React Hook Form**: フォーム管理
- **Zod**: スキーマバリデーション
- **Zustand**: ステート管理
- **Axios**: HTTP クライアント
- **Lucide React**: アイコンライブラリ

## 🔙 バックエンド技術スタック

- **Flask 3.0**: マイクロフレームワーク
- **Flask-CORS**: CORS サポート
- **Flask-JWT-Extended**: JWT 認証
- **Python-docx**: DOCX ファイル操作
- **PyPDF2**: PDF テキスト抽出
- **SQLAlchemy**: ORM
- **Marshmallow**: データバリデーション

## 🧪 テスト

### フロントエンド

```bash
cd frontend
npm run test
```

### バックエンド

```bash
cd backend
pytest
```

## 📝 ビルド・デプロイ

### フロントエンド（Vercel へのデプロイ）

```bash
cd frontend
npm run build
# Vercel CLI でデプロイ
vercel deploy
```

### バックエンド（任意のサーバーへのデプロイ）

```bash
cd backend

# 本番用設定
export FLASK_ENV=production
export SECRET_KEY=<your-secret-key>
export JWT_SECRET_KEY=<your-jwt-secret-key>

# Gunicorn で起動
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

## 🐛 トラブルシューティング

### フロントエンド

- **ポート 3000 が既に使用されている**:
  ```bash
  npm run dev -- -p 3001
  ```

- **モジュールが見つからない**:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### バックエンド

- **ポート 5000 が既に使用されている**:
  ```bash
  python app.py --port 5001
  ```

- **PDF 抽出がうまくいかない**:
  PDF が破損していないか確認し、PyPDF2 のバージョンを確認してください。

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. `.env` ファイルが正しく設定されているか
2. API URL が正しく設定されているか
3. バックエンド/フロントエンドサーバーが起動しているか
4. ネットワーク接続が正常か

## 📄 ライセンス

このプロジェクトはプロプライエタリーソフトウェアです。

---

**バージョン**: 1.0.0  
**最終更新**: 2026年5月23日
