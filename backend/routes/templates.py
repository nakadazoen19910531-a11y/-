"""
テンプレート管理エンドポイント
GET    /api/templates/          テンプレート一覧（認証必須）
POST   /api/templates/          テンプレートアップロード（管理者のみ）
DELETE /api/templates/<id>      テンプレート削除（管理者のみ）
GET    /api/templates/<id>/download  テンプレートファイルダウンロード（認証必須）
"""
import io
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.template_service import TemplateService
from models.user import UserModel

templates_bp = Blueprint('templates', __name__)
_template_service = TemplateService()


def _is_admin(user_id: str) -> bool:
    """ユーザーが管理者かどうかを確認する"""
    try:
        user_model = UserModel()
        user = user_model.find_by_id(user_id)
        return user is not None and user.get('role') == 'admin'
    except Exception:
        return False


# ─── 一覧取得 ──────────────────────────────────────────────────────────────────
@templates_bp.route('/', methods=['GET'])
@jwt_required()
def list_templates():
    """全テンプレートの一覧を返す（全認証ユーザー対象）"""
    try:
        templates = _template_service.get_all()
        return jsonify({
            'status': 'success',
            'templates': templates,
            'total': len(templates),
        }), 200
    except Exception as e:
        return jsonify({'error': 'テンプレート一覧の取得に失敗しました', 'message': str(e)}), 500


# ─── アップロード ──────────────────────────────────────────────────────────────
@templates_bp.route('/', methods=['POST'])
@jwt_required()
def upload_template():
    """DOCXテンプレートをアップロードする（管理者のみ）"""
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': '管理者のみテンプレートをアップロードできます'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'ファイルがありません'}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'error': 'ファイルが選択されていません'}), 400

    if not file.filename.lower().endswith('.docx'):
        return jsonify({'error': 'DOCXファイル（.docx）のみアップロード可能です'}), 400

    name = request.form.get('name', '').strip() or file.filename
    description = request.form.get('description', '').strip()

    try:
        file_bytes = file.read()
        if len(file_bytes) == 0:
            return jsonify({'error': 'ファイルが空です'}), 400
        if len(file_bytes) > 50 * 1024 * 1024:  # 50 MB 上限
            return jsonify({'error': 'ファイルサイズは50MB以下にしてください'}), 400

        template = _template_service.save(name, description, file_bytes, file.filename)
        return jsonify({'status': 'success', 'template': template}), 201

    except Exception as e:
        return jsonify({'error': 'テンプレートの保存に失敗しました', 'message': str(e)}), 500


# ─── 削除 ──────────────────────────────────────────────────────────────────────
@templates_bp.route('/<template_id>', methods=['DELETE'])
@jwt_required()
def delete_template(template_id: str):
    """テンプレートを削除する（管理者のみ）"""
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': '管理者のみテンプレートを削除できます'}), 403

    try:
        success = _template_service.delete(template_id)
        if not success:
            return jsonify({'error': 'テンプレートが見つかりません'}), 404
        return jsonify({'status': 'success', 'message': 'テンプレートを削除しました'}), 200
    except Exception as e:
        return jsonify({'error': 'テンプレートの削除に失敗しました', 'message': str(e)}), 500


# ─── ダウンロード ──────────────────────────────────────────────────────────────
@templates_bp.route('/<template_id>/download', methods=['GET'])
@jwt_required()
def download_template(template_id: str):
    """テンプレートファイルをダウンロードする（全認証ユーザー対象）"""
    try:
        template = _template_service.get_by_id(template_id)
        if not template:
            return jsonify({'error': 'テンプレートが見つかりません'}), 404

        file_bytes = _template_service.get_file_bytes(template_id)
        if not file_bytes:
            return jsonify({'error': 'テンプレートファイルが見つかりません'}), 404

        download_name = template.get('original_filename') or f'{template["name"]}.docx'
        return send_file(
            io.BytesIO(file_bytes),
            as_attachment=True,
            download_name=download_name,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
    except Exception as e:
        return jsonify({'error': 'ダウンロードに失敗しました', 'message': str(e)}), 500
