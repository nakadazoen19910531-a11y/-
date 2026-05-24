"""
Supabase クライアントのシングルトン管理

環境変数 SUPABASE_URL と SUPABASE_KEY が設定されている場合のみクライアントを生成する。
未設定の場合は None を返し、各サービスは JSON ファイルのフォールバックモードで動作する。
"""
import os
from typing import Optional

_client = None
_initialized = False


def get_client():
    """
    Supabase クライアントを返す。
    環境変数が未設定の場合は None を返す（フォールバックモード）。
    """
    global _client, _initialized
    if _initialized:
        return _client

    _initialized = True
    url = os.getenv('SUPABASE_URL', '').strip()
    key = (os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY') or '').strip()

    if not url or not key:
        print('ℹ️ SUPABASE_URL / SUPABASE_KEY 未設定 → JSONファイルモードで起動')
        return None

    try:
        from supabase import create_client
        _client = create_client(url, key)
        print('✅ Supabase 接続成功')
    except Exception as e:
        print(f'⚠️ Supabase 接続エラー: {e} → JSONファイルモードにフォールバック')
        _client = None

    return _client


def is_available() -> bool:
    """Supabase が利用可能かどうかを返す"""
    return get_client() is not None
