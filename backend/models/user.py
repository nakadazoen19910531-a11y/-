"""
ユーザーモデル - JSONファイルベースの軽量実装
（将来的にSQLAlchemyへ移行可能な構造で設計）
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
    """ユーザーデータの管理クラス（JSONファイルベース）"""

    def __init__(self):
        self.data_dir = os.path.join(
            os.path.dirname(__file__), '..', 'data', 'users'
        )
        os.makedirs(self.data_dir, exist_ok=True)
        self._users_file = os.path.join(self.data_dir, 'users.json')
        self._ensure_users_file()

    def _ensure_users_file(self):
        """ユーザーファイルが存在しない場合は作成"""
        if not os.path.exists(self._users_file):
            # デモユーザーを初期データとして作成
            demo_users = [
                {
                    'id': '1',
                    'email': 'demo@example.com',
                    'name': 'デモユーザー',
                    'password_hash': self._hash_password('password123'),
                    'role': 'user',
                    'created_at': datetime.now().isoformat(),
                    'is_active': True
                }
            ]
            self._save_users(demo_users)

    def _load_users(self) -> list:
        """ユーザーリストをファイルから読み込む"""
        try:
            with open(self._users_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_users(self, users: list) -> None:
        """ユーザーリストをファイルに保存"""
        os.makedirs(os.path.dirname(self._users_file), exist_ok=True)
        with open(self._users_file, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)

    def _hash_password(self, password: str) -> str:
        """パスワードをハッシュ化"""
        salt = secrets.token_hex(16)
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return f"{salt}:{key.hex()}"

    def _verify_password(self, password: str, password_hash: str) -> bool:
        """パスワードを検証"""
        try:
            salt, stored_key = password_hash.split(':')
            key = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode('utf-8'),
                salt.encode('utf-8'),
                100000
            )
            return hmac.compare_digest(key.hex(), stored_key)
        except Exception:
            return False

    def list_all(self) -> list:
        """アクティブなユーザー全員をパスワードハッシュ除きで返す"""
        users = self._load_users()
        return [
            self._sanitize(u)
            for u in users
            if u.get('is_active', True)
        ]

    def find_by_email(self, email: str) -> Optional[dict]:
        """メールアドレスでユーザーを検索"""
        users = self._load_users()
        for user in users:
            if user['email'].lower() == email.lower():
                return user
        return None

    def find_by_id(self, user_id: str) -> Optional[dict]:
        """IDでユーザーを検索"""
        users = self._load_users()
        for user in users:
            if user['id'] == user_id:
                return user
        return None

    def authenticate(self, email: str, password: str) -> Optional[dict]:
        """
        メールアドレスとパスワードでユーザーを認証

        Returns:
            認証成功時はユーザーデータ（パスワードハッシュ除く）、失敗時はNone
        """
        user = self.find_by_email(email)
        if not user:
            return None

        if not user.get('is_active', True):
            return None

        if not self._verify_password(password, user['password_hash']):
            return None

        # パスワードハッシュを除いて返す
        return self._sanitize(user)

    def create(self, email: str, password: str, name: str, role: str = 'user') -> dict:
        """
        新しいユーザーを作成

        Returns:
            作成したユーザーデータ（パスワードハッシュ除く）

        Raises:
            ValueError: メールアドレスが既に使用されている場合
        """
        # 重複チェック
        if self.find_by_email(email):
            raise ValueError(f"メールアドレス '{email}' は既に使用されています")

        users = self._load_users()

        new_user = {
            'id': str(uuid.uuid4()),
            'email': email,
            'name': name,
            'password_hash': self._hash_password(password),
            'role': role,
            'created_at': datetime.now().isoformat(),
            'is_active': True
        }

        users.append(new_user)
        self._save_users(users)

        return self._sanitize(new_user)

    def update(self, user_id: str, data: dict) -> Optional[dict]:
        """
        ユーザー情報を更新

        Returns:
            更新後のユーザーデータ（パスワードハッシュ除く）
        """
        users = self._load_users()
        for i, user in enumerate(users):
            if user['id'] == user_id:
                # 更新可能フィールド
                allowed_fields = {'name', 'email', 'role', 'is_active'}
                for key, value in data.items():
                    if key in allowed_fields:
                        users[i][key] = value

                # パスワード変更
                if 'password' in data:
                    users[i]['password_hash'] = self._hash_password(data['password'])

                users[i]['updated_at'] = datetime.now().isoformat()
                self._save_users(users)
                return self._sanitize(users[i])

        return None

    def delete(self, user_id: str) -> bool:
        """ユーザーを削除（論理削除: is_active = False）"""
        users = self._load_users()
        for i, user in enumerate(users):
            if user['id'] == user_id:
                users[i]['is_active'] = False
                users[i]['deleted_at'] = datetime.now().isoformat()
                self._save_users(users)
                return True
        return False

    def _sanitize(self, user: dict) -> dict:
        """パスワードハッシュを除いたユーザーデータを返す"""
        return {k: v for k, v in user.items() if k != 'password_hash'}
