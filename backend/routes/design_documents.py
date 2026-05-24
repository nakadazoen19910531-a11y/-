"""
設計図書管理エンドポイント
公共工事の設計図書（契約書・図面・仕様書・数量計算書等）を管理する

GET    /api/design-documents/              一覧（認証必須）
POST   /api/design-documents/              アップロード（管理者のみ）
DELETE /api/design-documents/<id>          削除（管理者のみ）
GET    /api/design-documents/<id>/download ダウンロード（認証必須）
"""
import io
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.design_document_service import DesignDocumentService
from models.user import UserModel

design_documents_bp = Blueprint('design_documents', __name__)
_service = DesignDocumentService()

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
@design_documents_bp.route('/', methods=['GET'])
@jwt_required()
def list_documents():
    """全設計図書の一覧を返す（全認証ユーザー対象）"""
    try:
        docs = _service.get_all()
        return jsonify({
            'status': 'success',
            'design_documents': docs,
            'total': len(docs),
        }), 200
    except Exception as e:
        return jsonify({'error': '設計図書一覧の取得に失敗しました', 'message': str(e)}), 500


# ─── アップロード ──────────────────────────────────────────────────────────────
@design_documents_bp.route('/', methods=['POST'])
@jwt_required()
def upload_document():
    """設計図書をアップロードする（管理者のみ）"""
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': '管理者のみ設計図書をアップロードできます'}), 403

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

    name          = request.form.get('name', '').strip() or file.filename
    description   = request.form.get('description', '').strip()
    document_type = request.form.get('document_type', '').strip()
    project_name  = request.form.get('project_name', '').strip()
    client        = request.form.get('client', '').strip()
    location      = request.form.get('location', '').strip()
    year          = request.form.get('year', '').strip()

    try:
        file_bytes = file.read()
        if len(file_bytes) == 0:
            return jsonify({'error': 'ファイルが空です'}), 400
        # 設計図書は大きい場合があるので上限を500MBに拡大
        if len(file_bytes) > 500 * 1024 * 1024:
            return jsonify({'error': 'ファイルサイズは500MB以下にしてください'}), 400

        doc = _service.save(
            name=name,
            description=description,
            file_bytes=file_bytes,
            original_filename=file.filename,
            document_type=document_type,
            project_name=project_name,
            client=client,
            location=location,
            year=year,
            uploaded_by=user_id,
        )
        return jsonify({'status': 'success', 'design_document': doc}), 201

    except Exception as e:
        return jsonify({'error': '設計図書の保存に失敗しました', 'message': str(e)}), 500


# ─── 削除 ──────────────────────────────────────────────────────────────────────
@design_documents_bp.route('/<doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id: str):
    """設計図書を削除する（管理者のみ）"""
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': '管理者のみ設計図書を削除できます'}), 403

    try:
        success = _service.delete(doc_id)
        if not success:
            return jsonify({'error': '設計図書が見つかりません'}), 404
        return jsonify({'status': 'success', 'message': '設計図書を削除しました'}), 200
    except Exception as e:
        return jsonify({'error': '設計図書の削除に失敗しました', 'message': str(e)}), 500


# ─── ダウンロード ──────────────────────────────────────────────────────────────
@design_documents_bp.route('/<doc_id>/download', methods=['GET'])
@jwt_required()
def download_document(doc_id: str):
    """設計図書ファイルをダウンロードする（全認証ユーザー対象）"""
    try:
        doc = _service.get_by_id(doc_id)
        if not doc:
            return jsonify({'error': '設計図書が見つかりません'}), 404

        file_bytes = _service.get_file_bytes(doc_id)
        if not file_bytes:
            return jsonify({'error': '設計図書ファイルが見つかりません'}), 404

        download_name = doc.get('original_filename') or f'{doc["name"]}'
        mime_type = doc.get('mime_type') or 'application/octet-stream'
        return send_file(
            io.BytesIO(file_bytes),
            as_attachment=True,
            download_name=download_name,
            mimetype=mime_type,
        )
    except Exception as e:
        return jsonify({'error': 'ダウンロードに失敗しました', 'message': str(e)}), 500
