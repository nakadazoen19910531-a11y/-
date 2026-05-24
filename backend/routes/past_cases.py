"""
過去事例（施工計画書）管理エンドポイント
GET    /api/past-cases/              過去事例一覧（認証必須）
POST   /api/past-cases/              過去事例アップロード（管理者のみ）
DELETE /api/past-cases/<id>          過去事例削除（管理者のみ）
GET    /api/past-cases/<id>/download 過去事例ダウンロード（認証必須）

対応ファイル形式: PDF / DOCX / DOC / XLSX / XLS / ZIP
"""
import io
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.past_case_service import PastCaseService
from models.user import UserModel

past_cases_bp = Blueprint('past_cases', __name__)
_past_case_service = PastCaseService()

# アップロード許可される拡張子
_ALLOWED_EXTS = {'.pdf', '.docx', '.doc', '.xlsx', '.xls', '.zip'}


def _is_admin(user_id: str) -> bool:
    """ユーザーが管理者かどうかを確認する"""
    try:
        user_model = UserModel()
        user = user_model.find_by_id(user_id)
        return user is not None and user.get('role') == 'admin'
    except Exception:
        return False


# ─── 一覧取得 ──────────────────────────────────────────────────────────────────
@past_cases_bp.route('/', methods=['GET'])
@jwt_required()
def list_past_cases():
    """全過去事例の一覧を返す（全認証ユーザー対象）"""
    try:
        past_cases = _past_case_service.get_all()
        return jsonify({
            'status': 'success',
            'past_cases': past_cases,
            'total': len(past_cases),
        }), 200
    except Exception as e:
        return jsonify({'error': '過去事例一覧の取得に失敗しました', 'message': str(e)}), 500


# ─── アップロード ──────────────────────────────────────────────────────────────
@past_cases_bp.route('/', methods=['POST'])
@jwt_required()
def upload_past_case():
    """DOCX 過去事例をアップロードする（管理者のみ）"""
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': '管理者のみ過去事例をアップロードできます'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'ファイルがありません'}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'error': 'ファイルが選択されていません'}), 400

    ext = Path(file.filename).suffix.lower()
    if ext not in _ALLOWED_EXTS:
        return jsonify({
            'error': f'対応していないファイル形式です（{ext}）',
            'message': f'対応形式: {", ".join(sorted(_ALLOWED_EXTS))}'
        }), 400

    name         = request.form.get('name', '').strip() or file.filename
    description  = request.form.get('description', '').strip()
    project_type = request.form.get('project_type', '').strip()
    client       = request.form.get('client', '').strip()
    location     = request.form.get('location', '').strip()
    year         = request.form.get('year', '').strip()

    try:
        file_bytes = file.read()
        if len(file_bytes) == 0:
            return jsonify({'error': 'ファイルが空です'}), 400
        # 過去事例（PDF・Excel等含む）は最大100MB
        if len(file_bytes) > 100 * 1024 * 1024:
            return jsonify({'error': 'ファイルサイズは100MB以下にしてください'}), 400

        past_case = _past_case_service.save(
            name=name,
            description=description,
            file_bytes=file_bytes,
            original_filename=file.filename,
            project_type=project_type,
            client=client,
            location=location,
            year=year,
            uploaded_by=user_id,
        )
        return jsonify({'status': 'success', 'past_case': past_case}), 201

    except Exception as e:
        return jsonify({'error': '過去事例の保存に失敗しました', 'message': str(e)}), 500


# ─── 削除 ──────────────────────────────────────────────────────────────────────
@past_cases_bp.route('/<case_id>', methods=['DELETE'])
@jwt_required()
def delete_past_case(case_id: str):
    """過去事例を削除する（管理者のみ）"""
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': '管理者のみ過去事例を削除できます'}), 403

    try:
        success = _past_case_service.delete(case_id)
        if not success:
            return jsonify({'error': '過去事例が見つかりません'}), 404
        return jsonify({'status': 'success', 'message': '過去事例を削除しました'}), 200
    except Exception as e:
        return jsonify({'error': '過去事例の削除に失敗しました', 'message': str(e)}), 500


# ─── ダウンロード ──────────────────────────────────────────────────────────────
@past_cases_bp.route('/<case_id>/download', methods=['GET'])
@jwt_required()
def download_past_case(case_id: str):
    """過去事例ファイルをダウンロードする（全認証ユーザー対象）"""
    try:
        past_case = _past_case_service.get_by_id(case_id)
        if not past_case:
            return jsonify({'error': '過去事例が見つかりません'}), 404

        file_bytes = _past_case_service.get_file_bytes(case_id)
        if not file_bytes:
            return jsonify({'error': '過去事例ファイルが見つかりません'}), 404

        download_name = past_case.get('original_filename') or past_case['name']
        mime_type = past_case.get('mime_type') or 'application/octet-stream'
        return send_file(
            io.BytesIO(file_bytes),
            as_attachment=True,
            download_name=download_name,
            mimetype=mime_type,
        )
    except Exception as e:
        return jsonify({'error': 'ダウンロードに失敗しました', 'message': str(e)}), 500
