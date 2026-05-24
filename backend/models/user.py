"""
ユーザーモデル - デュアルモード実装

SUPABASE_URL / SUPABASE_KEY が設定されている場合: Supabase PostgreSQL を使用
未設定の場合: JSON ファイルによるローカルフォールバック
"""
import json
import os
import uuid
import hashlib
import hmac
import secrets
from datetime import datetime
from typing import Optional


class UserModel:
    """ユーザーデータの管理クラス（Supabase優先 / JSONフォールバック）"""

    def __init__(self):
        # Supabase クライアントを取得（未設定なら None）
        from db.supabase_client import get_client
        self._sb = get_client()

        if self._sb:
            # Supabase モード: デモユーザーが存在しなければ作成
            self._ensure_demo_user_supabase()
        else:
            # JSON フォールバックモード
            self.data_dir = os.path.join(
                os.path.dirname(__file__), '..', 'data', 'users'
            )
            os.makedirs(self.data_dir, exist_ok=True)
            self._users_file = os.path.join(self.data_dir, 'users.json')
            self._ensure_users_file()

    # ─── 初期化ヘルパー ──────────────────────────────────────────────────────
    def _ensure_demo_user_supabase(self) -> None:
        """Supabase にユーザーが0件のとき、デモユーザーを作成する"""
        try:
            res = self._sb.table('users').select('id').limit(1).execute()
            if not res.data:
                self._sb.table('users').insert({
                    'id': '1',
                    'email': 'demo@example.com',
                    'name': 'デモユーザー',
                    'password_hash': self._hash_password('password123'),
                    'role': 'user',
                    'is_active': True,
                    'created_at': datetime.now().isoformat(),
                }).execute()
        except Exception as e:
            print(f'⚠️ デモユーザー作成エラー: {e}')

    def _ensure_users_file(self) -> None:
        """JSON ファイルが存在しない場合にデモユーザーを作成"""
        if not os.path.exists(self._users_file):
            demo_users = [{
                'id': '1',
                'email': 'demo@example.com',
                'name': 'デモユーザー',
                'password_hash': self._hash_password('password123'),
                'role': 'user',
                'is_active': True,
                'created_at': datetime.now().isoformat(),
            }]
            self._save_users(demo_users)

    # ─── JSON I/O（フォールバック用） ──────────────────────────────────────────
    def _load_users(self) -> list:
        try:
            with open(self._users_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_users(self, users: list) -> None:
        os.makedirs(os.path.dirname(self._users_file), exist_ok=True)
        with open(self._users_file, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)

    # ─── パスワード処理 ───────────────────────────────────────────────────────
    def _hash_password(self, password: str) -> str:
        salt = secrets.token_hex(16)
        key = hashlib.pbkdf2_hmac(
            'sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000
        )
        return f'{salt}:{key.hex()}'

    def _verify_password(self, password: str, password_hash: str) -> bool:
        try:
            salt, stored_key = password_hash.split(':')
            key = hashlib.pbkdf2_hmac(
                'sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000
            )
            return hmac.compare_digest(key.hex(), stored_key)
        except Exception:
            return False

    # ─── 公開 API ─────────────────────────────────────────────────────────────

    def list_all(self) -> list:
        """アクティブなユーザー全員（パスワードハッシュ除き）を返す"""
        if self._sb:
            try:
                res = self._sb.table('users').select('*').eq('is_active', True).execute()
                return [self._sanitize(u) for u in (res.data or [])]
            except Exception as e:
                print(f'Supabase list_all エラー: {e}')
                return []
        # JSON fallback
        return [self._sanitize(u) for u in self._load_users() if u.get('is_active', True)]

    def find_by_email(self, email: str) -> Optional[dict]:
        """メールアドレスでユーザーを検索（パスワードハッシュ含む生データを返す）"""
        if self._sb:
            try:
                res = self._sb.table('users').select('*').eq(
                    'email', email.lower()
                ).execute()
                return res.data[0] if res.data else None
            except Exception as e:
                print(f'Supabase find_by_email エラー: {e}')
                return None
        # JSON fallback
        for user in self._load_users():
            if user['email'].lower() == email.lower():
                return user
        return None

    def find_by_id(self, user_id: str) -> Optional[dict]:
        """IDでユーザーを検索（パスワードハッシュ含む生データを返す）"""
        if self._sb:
            try:
                res = self._sb.table('users').select('*').eq('id', user_id).execute()
                return res.data[0] if res.data else None
            except Exception as e:
                print(f'Supabase find_by_id エラー: {e}')
                return None
        # JSON fallback
        for user in self._load_users():
            if user['id'] == user_id:
                return user
        return None

    def authenticate(self, email: str, password: str) -> Optional[dict]:
        """認証成功時はユーザーデータ（パスワードハッシュ除く）を返す"""
        user = self.find_by_email(email)
        if not user:
            return None
        if not user.get('is_active', True):
            return None
        if not self._verify_password(password, user['password_hash']):
            return None
        return self._sanitize(user)

    def create(self, email: str, password: str, name: str, role: str = 'user') -> dict:
        """新しいユーザーを作成して返す（パスワードハッシュ除く）"""
        if self.find_by_email(email):
            raise ValueError(f"メールアドレス '{email}' は既に使用されています")

        new_user = {
            'id': str(uuid.uuid4()),
            'email': email.lower(),
            'name': name,
            'password_hash': self._hash_password(password),
            'role': role,
            'is_active': True,
            'created_at': datetime.now().isoformat(),
        }

        if self._sb:
            try:
                self._sb.table('users').insert(new_user).execute()
                return self._sanitize(new_user)
            except Exception as e:
                raise Exception(f'ユーザー作成に失敗しました: {e}')
        # JSON fallback
        users = self._load_users()
        users.append(new_user)
        self._save_users(users)
        return self._sanitize(new_user)

    def update(self, user_id: str, data: dict) -> Optional[dict]:
        """ユーザー情報を更新して返す"""
        allowed_fields = {'name', 'email', 'role', 'is_active'}
        updates = {k: v for k, v in data.items() if k in allowed_fields}
        if 'password' in data:
            updates['password_hash'] = self._hash_password(data['password'])
        updates['updated_at'] = datetime.now().isoformat()

        if self._sb:
            try:
                res = self._sb.table('users').update(updates).eq('id', user_id).execute()
                return self._sanitize(res.data[0]) if res.data else None
            except Exception as e:
                raise Exception(f'ユーザー更新に失敗しました: {e}')
        # JSON fallback
        users = self._load_users()
        for i, user in enumerate(users):
            if user['id'] == user_id:
                users[i].update(updates)
                self._save_users(users)
                return self._sanitize(users[i])
        return None

    def delete(self, user_id: str) -> bool:
        """ユーザーを論理削除（is_active = False）"""
        updates = {'is_active': False, 'deleted_at': datetime.now().isoformat()}

        if self._sb:
            try:
                res = self._sb.table('users').update(updates).eq('id', user_id).execute()
                return bool(res.data)
            except Exception as e:
                print(f'Supabase delete エラー: {e}')
                return False
        # JSON fallback
        users = self._load_users()
        for i, user in enumerate(users):
            if user['id'] == user_id:
                users[i].update(updates)
                self._save_users(users)
                return True
        return False

    def _sanitize(self, user: dict) -> dict:
        """パスワードハッシュを除いたユーザーデータを返す"""
        return {k: v for k, v in user.items() if k != 'password_hash'}
