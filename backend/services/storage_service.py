"""
オブジェクトストレージ連携サービス（共通ヘルパー）

優先順位:
  1. Cloudflare R2 (S3互換) - R2_ENDPOINT_URL 等が設定されている場合
  2. Supabase Storage - SUPABASE_URL 等が設定されている場合（フォールバック）
  3. 何もしない - 全て未設定の場合は None を返す

R2 環境変数:
  R2_ENDPOINT_URL       例: https://xxxxxxxxxxxx.r2.cloudflarestorage.com
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET             デフォルト: sekoplan-files

Supabase 環境変数:
  SUPABASE_URL
  SUPABASE_KEY
  SUPABASE_STORAGE_BUCKET  デフォルト: sekoplan-files

全ファイル（テンプレート/過去事例/設計図書/生成された施工計画書）を
単一バケットに保存し、サブパスでカテゴリ分けする:

  sekoplan-files/
    templates/<uuid>.docx
    past-cases/<uuid>.<ext>
    design-documents/<uuid>.<ext>
    plans/<uuid>.docx
"""
import os
from typing import Optional
import requests


# ─── バックエンド種別を判定 ──────────────────────────────────────────────

def _r2_credentials() -> Optional[dict]:
    """R2 認証情報が揃っているか確認して返す"""
    endpoint = os.getenv('R2_ENDPOINT_URL', '').strip().rstrip('/')
    access_key = os.getenv('R2_ACCESS_KEY_ID', '').strip()
    secret_key = os.getenv('R2_SECRET_ACCESS_KEY', '').strip()
    bucket = os.getenv('R2_BUCKET', 'sekoplan-files').strip()
    if endpoint and access_key and secret_key and bucket:
        return {
            'endpoint': endpoint,
            'access_key': access_key,
            'secret_key': secret_key,
            'bucket': bucket,
        }
    return None


def _supabase_credentials() -> Optional[dict]:
    """Supabase 認証情報が揃っているか確認して返す"""
    url = os.getenv('SUPABASE_URL', '').strip().rstrip('/')
    key = (os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY') or '').strip()
    bucket = os.getenv('SUPABASE_STORAGE_BUCKET', 'sekoplan-files').strip()
    if url and key:
        return {'url': url, 'key': key, 'bucket': bucket}
    return None


def get_backend() -> str:
    """現在使用しているストレージバックエンド名を返す: 'r2' | 'supabase' | 'none'"""
    if _r2_credentials():
        return 'r2'
    if _supabase_credentials():
        return 'supabase'
    return 'none'


def is_available() -> bool:
    """いずれかのオブジェクトストレージが利用可能か"""
    return get_backend() != 'none'


# ─── boto3 クライアント（R2 用、キャッシュ） ──────────────────────────────

_r2_client = None


def _get_r2_client():
    """R2 (S3互換) クライアントを取得（シングルトン）"""
    global _r2_client
    if _r2_client is not None:
        return _r2_client
    creds = _r2_credentials()
    if not creds:
        return None
    try:
        import boto3
        from botocore.config import Config
        _r2_client = boto3.client(
            's3',
            endpoint_url=creds['endpoint'],
            aws_access_key_id=creds['access_key'],
            aws_secret_access_key=creds['secret_key'],
            region_name='auto',
            config=Config(
                signature_version='s3v4',
                retries={'max_attempts': 3},
            ),
        )
        print(f'✅ Cloudflare R2 接続成功 (bucket={creds["bucket"]})')
        return _r2_client
    except ImportError as e:
        print(f'⚠️ boto3 ライブラリが未インストール: {e}')
        return None
    except Exception as e:
        print(f'⚠️ R2 クライアント初期化エラー: {e}')
        return None


# ─── 公開 API ─────────────────────────────────────────────────────────────

def upload(category: str, file_id: str, file_bytes: bytes,
           filename_ext: str = '', content_type: str = 'application/octet-stream') -> Optional[str]:
    """
    ファイルをオブジェクトストレージにアップロードする。

    Args:
        category: 'templates' | 'past-cases' | 'design-documents' | 'plans'
        file_id: 一意ID（通常UUID）
        file_bytes: アップロードするバイト列
        filename_ext: 拡張子（先頭の . 含む。例 '.docx', '.pdf'）
        content_type: MIMEタイプ

    Returns:
        成功時: ストレージパス（例 'templates/abc123.docx'）
        失敗時: None
    """
    storage_path = f'{category}/{file_id}{filename_ext}'
    backend = get_backend()

    if backend == 'r2':
        return _upload_r2(storage_path, file_bytes, content_type)
    elif backend == 'supabase':
        return _upload_supabase(storage_path, file_bytes, content_type)
    return None


def download(storage_path: str) -> Optional[bytes]:
    """
    オブジェクトストレージからファイルをダウンロードする。

    Args:
        storage_path: 'templates/abc123.docx' 形式

    Returns:
        成功時: バイト列、失敗時: None
    """
    if not storage_path:
        return None
    backend = get_backend()

    if backend == 'r2':
        return _download_r2(storage_path)
    elif backend == 'supabase':
        return _download_supabase(storage_path)
    return None


def delete(storage_path: str) -> bool:
    """ファイルを削除する。成功時 True"""
    if not storage_path:
        return False
    backend = get_backend()

    if backend == 'r2':
        return _delete_r2(storage_path)
    elif backend == 'supabase':
        return _delete_supabase(storage_path)
    return False


def get_public_url(storage_path: str) -> Optional[str]:
    """ファイルへの公開URL（Public bucket のみ）"""
    if not storage_path:
        return None
    backend = get_backend()

    if backend == 'r2':
        # R2 は Custom Domain 設定がない限り公開URL未対応 → None
        # 必要なら presigned URL を発行
        return None
    elif backend == 'supabase':
        creds = _supabase_credentials()
        if creds:
            return f'{creds["url"]}/storage/v1/object/public/{creds["bucket"]}/{storage_path}'
    return None


# ─── R2 実装 ──────────────────────────────────────────────────────────────

def _upload_r2(storage_path: str, file_bytes: bytes, content_type: str) -> Optional[str]:
    client = _get_r2_client()
    if not client:
        return None
    creds = _r2_credentials()
    try:
        client.put_object(
            Bucket=creds['bucket'],
            Key=storage_path,
            Body=file_bytes,
            ContentType=content_type,
        )
        return storage_path
    except Exception as e:
        print(f'⚠️ R2 upload失敗 [{storage_path}]: {e}')
        return None


def _download_r2(storage_path: str) -> Optional[bytes]:
    client = _get_r2_client()
    if not client:
        return None
    creds = _r2_credentials()
    try:
        response = client.get_object(Bucket=creds['bucket'], Key=storage_path)
        return response['Body'].read()
    except Exception as e:
        print(f'⚠️ R2 download失敗 [{storage_path}]: {e}')
        return None


def _delete_r2(storage_path: str) -> bool:
    client = _get_r2_client()
    if not client:
        return False
    creds = _r2_credentials()
    try:
        client.delete_object(Bucket=creds['bucket'], Key=storage_path)
        return True
    except Exception as e:
        print(f'⚠️ R2 delete失敗 [{storage_path}]: {e}')
        return False


# ─── Supabase Storage 実装（レガシー fallback） ──────────────────────────

def _upload_supabase(storage_path: str, file_bytes: bytes, content_type: str) -> Optional[str]:
    creds = _supabase_credentials()
    if not creds:
        return None
    api_url = f'{creds["url"]}/storage/v1/object/{creds["bucket"]}/{storage_path}'
    headers = {
        'apikey': creds['key'],
        'Authorization': f'Bearer {creds["key"]}',
        'Content-Type': content_type,
        'x-upsert': 'true',
    }
    try:
        r = requests.post(api_url, headers=headers, data=file_bytes, timeout=300)
        if r.status_code in (200, 201):
            return storage_path
        print(f'⚠️ Supabase upload失敗 [{r.status_code}]: {r.text[:200]}')
        return None
    except Exception as e:
        print(f'⚠️ Supabase upload例外: {e}')
        return None


def _download_supabase(storage_path: str) -> Optional[bytes]:
    creds = _supabase_credentials()
    if not creds:
        return None
    api_url = f'{creds["url"]}/storage/v1/object/{creds["bucket"]}/{storage_path}'
    headers = {'apikey': creds['key'], 'Authorization': f'Bearer {creds["key"]}'}
    try:
        r = requests.get(api_url, headers=headers, timeout=120)
        if r.status_code == 200:
            return r.content
        return None
    except Exception as e:
        print(f'⚠️ Supabase download例外: {e}')
        return None


def _delete_supabase(storage_path: str) -> bool:
    creds = _supabase_credentials()
    if not creds:
        return False
    api_url = f'{creds["url"]}/storage/v1/object/{creds["bucket"]}/{storage_path}'
    headers = {'apikey': creds['key'], 'Authorization': f'Bearer {creds["key"]}'}
    try:
        r = requests.delete(api_url, headers=headers, timeout=30)
        return r.status_code in (200, 204)
    except Exception:
        return False
