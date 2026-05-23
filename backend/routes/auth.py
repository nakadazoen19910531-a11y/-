"""認証エンドポイント"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
from models.user import UserModel

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    ログインエンドポイント

    Request body:
        email: メールアドレス
        password: パスワード

    Returns:
        JSON: 認証トークンとユーザー情報
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'リクエストデータが不正です'}), 400

    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'メールアドレスとパスワードを入力してください'}), 400

    # ユーザー認証
    user_model = UserModel()
    user = user_model.authenticate(email, password)

    if not user:
        return jsonify({'error': 'メールアドレスまたはパスワードが正しくありません'}), 401

    # JWTトークンを生成
    access_token = create_access_token(identity=user['id'])
    refresh_token = create_refresh_token(identity=user['id'])

    return jsonify({
        'token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role']
        }
    }), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    ユーザー登録エンドポイント

    Request body:
        email: メールアドレス
        password: パスワード（8文字以上）
        name: 氏名

    Returns:
        JSON: 認証トークンと作成したユーザー情報
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'リクエストデータが不正です'}), 400

    email = data.get('email', '').strip()
    password = data.get('password', '')
    name = data.get('name', '').strip()

    # バリデーション
    if not all([email, password, name]):
        return jsonify({'error': 'メールアドレス、パスワード、お名前をすべて入力してください'}), 400

    if len(password) < 8:
        return jsonify({'error': 'パスワードは8文字以上で設定してください'}), 400

    import re
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({'error': '有効なメールアドレスを入力してください'}), 400

    # ユーザー作成
    user_model = UserModel()
    try:
        user = user_model.create(email=email, password=password, name=name)
    except ValueError as e:
        return jsonify({'error': str(e)}), 409

    # JWTトークンを生成
    access_token = create_access_token(identity=user['id'])
    refresh_token = create_refresh_token(identity=user['id'])

    return jsonify({
        'token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role']
        }
    }), 201


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    アクセストークンを更新

    Returns:
        JSON: 新しいアクセストークン
    """
    identity = get_jwt_identity()

    # ユーザーの存在確認
    user_model = UserModel()
    user = user_model.find_by_id(identity)
    if not user or not user.get('is_active', True):
        return jsonify({'error': 'ユーザーが見つかりません'}), 401

    access_token = create_access_token(identity=identity)
    return jsonify({'token': access_token}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    ログアウト

    Returns:
        JSON: ログアウト確認
    """
    # NOTE: 本番環境ではトークンブラックリストによる無効化が必要
    # 現在はクライアント側でトークンを削除する方式
    return jsonify({'message': 'ログアウトしました'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    現在のログインユーザー情報を取得

    Returns:
        JSON: 現在のユーザー情報
    """
    user_id = get_jwt_identity()
    user_model = UserModel()
    user = user_model.find_by_id(user_id)

    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404

    return jsonify({'user': user}), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """
    ユーザー一覧を取得（ログイン済みユーザーのみ）

    Returns:
        JSON: アクティブなユーザーのリスト
    """
    user_model = UserModel()
    users = user_model.list_all()
    return jsonify({'users': users, 'total': len(users)}), 200


@auth_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user_by_admin():
    """
    管理者によるユーザー新規登録（ログイン不要・JWT認証済み）

    Request body:
        email: メールアドレス
        password: パスワード（8文字以上）
        name: 氏名
        role: 権限（user / admin、省略時はuser）

    Returns:
        JSON: 作成したユーザー情報
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'リクエストデータが不正です'}), 400

    email = data.get('email', '').strip()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    role = data.get('role', 'user')

    if not all([email, password, name]):
        return jsonify({'error': 'メールアドレス、パスワード、お名前をすべて入力してください'}), 400

    if len(password) < 8:
        return jsonify({'error': 'パスワードは8文字以上で設定してください'}), 400

    import re
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({'error': '有効なメールアドレスを入力してください'}), 400

    if role not in ('user', 'admin'):
        role = 'user'

    user_model = UserModel()
    try:
        user = user_model.create(email=email, password=password, name=name, role=role)
    except ValueError as e:
        return jsonify({'error': str(e)}), 409

    return jsonify({'user': user, 'message': f'ユーザー「{name}」を登録しました'}), 201


@auth_bp.route('/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """
    ユーザーを削除（論理削除）

    自分自身は削除不可

    Returns:
        JSON: 削除確認メッセージ
    """
    current_user_id = get_jwt_identity()

    # 自分自身の削除は禁止
    if str(current_user_id) == str(user_id):
        return jsonify({'error': '自分自身のアカウントは削除できません'}), 400

    user_model = UserModel()
    target = user_model.find_by_id(user_id)
    if not target:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404

    success = user_model.delete(user_id)
    if not success:
        return jsonify({'error': '削除に失敗しました'}), 500

    return jsonify({'message': f'ユーザー「{target["name"]}」を削除しました'}), 200
