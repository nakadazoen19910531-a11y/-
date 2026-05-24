"""
Supabase Storage 連携サービス（共通ヘルパー）

Supabase Storage REST API を直接叩く実装。
supabase-py のバージョン差異の影響を受けず、HTTP のみで動作する。

全ファイル（テンプレート/過去事例/設計図書/生成された施工計画書）を
単一バケット sekoplan-files に保存し、サブパスでカテゴリ分けする。

  sekoplan-files/
    templates/<uuid>.docx
    past-cases/<uuid>.docx
    design-documents/<uuid>.<ext>
    plans/<uuid>.docx
"""
import os
from typing import Optional
import requests


# 単一バケット名
BUCKET = os.getenv('SUPABASE_STORAGE_BUCKET', 'sekoplan-files')


def _get_credentials() -> Optional[tuple]:
    """環境変数から Supabase URL とキーを取得"""
    url = os.getenv('SUPABASE_URL', '').strip().rstrip('/')
    key = (os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY') or '').strip()
    if not url or not key:
        return None
    return url, key


def is_available() -> bool:
    """Supabase Storage が利用可能か"""
    return _get_credentials() is not None


def upload(category: str, file_id: str, file_bytes: bytes,
           filename_ext: str = '', content_type: str = 'application/octet-stream') -> Optional[str]:
    """
    ファイルを Supabase Storage にアップロードする。

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
    creds = _get_credentials()
    if not creds:
        return None
    url, key = creds

    storage_path = f'{category}/{file_id}{filename_ext}'
    api_url = f'{url}/storage/v1/object/{BUCKET}/{storage_path}'

    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': content_type,
        'x-upsert': 'true',  # 同名ファイルは上書き
    }

    try:
        r = requests.post(api_url, headers=headers, data=file_bytes, timeout=60)
        if r.status_code in (200, 201):
            return storage_path
        print(f'⚠️ Storage upload失敗 [{r.status_code}]: {r.text[:200]}')
        return None
    except Exception as e:
        print(f'⚠️ Storage upload例外: {e}')
        return None


def download(storage_path: str) -> Optional[bytes]:
    """
    Supabase Storage からファイルをダウンロードする。

    Args:
        storage_path: 'templates/abc123.docx' 形式

    Returns:
        成功時: バイト列
        失敗時: None
    """
    creds = _get_credentials()
    if not creds or not storage_path:
        return None
    url, key = creds

    # public bucket なら /public/ パスでアクセス可能
    api_url = f'{url}/storage/v1/object/{BUCKET}/{storage_path}'
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
    }

    try:
        r = requests.get(api_url, headers=headers, timeout=60)
        if r.status_code == 200:
            return r.content
        print(f'⚠️ Storage download失敗 [{r.status_code}]: {r.text[:200]}')
        return None
    except Exception as e:
        print(f'⚠️ Storage download例外: {e}')
        return None


def delete(storage_path: str) -> bool:
    """
    Supabase Storage からファイルを削除する。

    Args:
        storage_path: 'templates/abc123.docx' 形式

    Returns:
        成功時: True、それ以外 False
    """
    creds = _get_credentials()
    if not creds or not storage_path:
        return False
    url, key = creds

    api_url = f'{url}/storage/v1/object/{BUCKET}/{storage_path}'
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
    }

    try:
        r = requests.delete(api_url, headers=headers, timeout=30)
        return r.status_code in (200, 204)
    except Exception as e:
        print(f'⚠️ Storage delete例外: {e}')
        return False


def get_public_url(storage_path: str) -> Optional[str]:
    """Public bucket のファイルへの公開URLを返す"""
    creds = _get_credentials()
    if not creds or not storage_path:
        return None
    url, _ = creds
    return f'{url}/storage/v1/object/public/{BUCKET}/{storage_path}'
