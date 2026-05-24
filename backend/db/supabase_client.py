"""
Supabase クライアント（REST API直接実装 - Python 3.14互換）

supabase-py SDKの代わりにrequestsライブラリを使用し、
Python 3.14でも動作する互換クライアントを提供する。
"""
import os
import sys
import json
import requests
from typing import Optional, Any

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

_client = None
_initialized = False


class _Result:
    """execute()の戻り値 - .data属性を持つ"""
    def __init__(self, data):
        self.data = data if data is not None else []


class _QueryBuilder:
    """Supabase SDKと同じインターフェースのクエリビルダー"""

    def __init__(self, base_url: str, table: str, headers: dict):
        self._base_url = base_url
        self._table = table
        self._headers = headers
        self._method = 'GET'
        self._columns = '*'
        self._filters = []
        self._order = None
        self._limit_val = None
        self._body = None

    def select(self, columns: str = '*'):
        self._method = 'GET'
        self._columns = columns
        return self

    def insert(self, data: dict):
        self._method = 'POST'
        self._body = data
        return self

    def update(self, data: dict):
        self._method = 'PATCH'
        self._body = data
        return self

    def delete(self):
        self._method = 'DELETE'
        return self

    def eq(self, column: str, value: Any):
        self._filters.append(f'{column}=eq.{value}')
        return self

    def order(self, column: str, desc: bool = False):
        direction = 'desc' if desc else 'asc'
        self._order = f'{column}.{direction}'
        return self

    def limit(self, n: int):
        self._limit_val = n
        return self

    def execute(self) -> _Result:
        url = f'{self._base_url}/rest/v1/{self._table}'
        params = {}

        if self._method == 'GET':
            params['select'] = self._columns
            for f in self._filters:
                k, v = f.split('=', 1)
                params[k] = v
            if self._order:
                params['order'] = self._order
            if self._limit_val:
                params['limit'] = self._limit_val

        elif self._method in ('PATCH', 'DELETE'):
            for f in self._filters:
                k, v = f.split('=', 1)
                params[k] = v

        headers = dict(self._headers)
        if self._method in ('POST', 'PATCH'):
            headers['Content-Type'] = 'application/json'
            headers['Prefer'] = 'return=representation'

        try:
            if self._method == 'GET':
                r = requests.get(url, headers=headers, params=params, timeout=30)
            elif self._method == 'POST':
                r = requests.post(url, headers=headers, params=params,
                                  data=json.dumps(self._body, ensure_ascii=False).encode('utf-8'), timeout=30)
            elif self._method == 'PATCH':
                r = requests.patch(url, headers=headers, params=params,
                                   data=json.dumps(self._body, ensure_ascii=False).encode('utf-8'), timeout=30)
            elif self._method == 'DELETE':
                headers['Prefer'] = 'return=representation'
                r = requests.delete(url, headers=headers, params=params, timeout=30)
            else:
                return _Result([])

            if r.status_code in (200, 201, 204):
                try:
                    data = r.json()
                    return _Result(data if isinstance(data, list) else [data])
                except Exception:
                    return _Result([])
            else:
                print(f'Supabase REST エラー [{self._method} {self._table}] {r.status_code}: {r.text[:200]}')
                return _Result([])
        except Exception as e:
            print(f'Supabase REST 例外 [{self._method} {self._table}]: {e}')
            return _Result([])


class _SupabaseClient:
    """Supabase SDKと同じインターフェースを持つカスタムクライアント"""

    def __init__(self, url: str, key: str):
        self._url = url.rstrip('/')
        self._headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
        }

    def table(self, name: str) -> _QueryBuilder:
        return _QueryBuilder(self._url, name, self._headers)


def get_client() -> Optional[_SupabaseClient]:
    """
    Supabase クライアントを返す。
    環境変数が未設定の場合は None を返す（JSONフォールバックモード）。
    """
    global _client, _initialized
    if _initialized:
        return _client

    _initialized = True
    url = os.getenv('SUPABASE_URL', '').strip().rstrip('/')
    key = (os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY') or '').strip()

    if not url or not key:
        print('INFO: SUPABASE_URL / SUPABASE_KEY 未設定 -> JSONファイルモードで起動')
        return None

    try:
        _client = _SupabaseClient(url, key)
        # 接続テスト（usersテーブルに軽量クエリ）
        result = _client.table('users').select('id').limit(1).execute()
        print('Supabase 接続成功')
    except Exception as e:
        print(f'Supabase 接続エラー: {e} -> JSONファイルモードにフォールバック')
        _client = None

    return _client


def is_available() -> bool:
    """Supabase が利用可能かどうかを返す"""
    return get_client() is not None
