"""PDFアップロード・テキスト抽出エンドポイント"""
import os
import tempfile
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from services.pdf_service import PDFService

pdf_bp = Blueprint('pdf', __name__)

ALLOWED_EXTENSIONS = {'pdf'}
MAX_FILE_SIZE_MB = 50


def allowed_file(filename: str) -> bool:
    """PDFファイルか確認"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@pdf_bp.route('/extract', methods=['POST'])
@jwt_required()
def extract_pdf():
    """
    PDFファイルから契約情報を抽出

    Request (multipart/form-data):
        files: アップロードするPDFファイル（複数可）

    Returns:
        JSON: 抽出した契約情報（projectName, contractNumber, location, startDate, endDate, contractAmount, client）
    """
    if 'files' not in request.files:
        return jsonify({'error': 'ファイルが指定されていません'}), 400

    files = request.files.getlist('files')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'ファイルを選択してください'}), 400

    extracted_data = {}
    errors = []
    pdf_service = PDFService()

    with tempfile.TemporaryDirectory() as tmp_dir:
        for file in files:
            if not file or file.filename == '':
                continue

            if not allowed_file(file.filename):
                errors.append(f"'{file.filename}' はPDFファイルではありません")
                continue

            try:
                # 一時ファイルとして保存
                filename = secure_filename(file.filename)
                temp_path = os.path.join(tmp_dir, filename)
                file.save(temp_path)

                # ファイルサイズチェック
                file_size_mb = os.path.getsize(temp_path) / (1024 * 1024)
                if file_size_mb > MAX_FILE_SIZE_MB:
                    errors.append(f"'{filename}' はファイルサイズが大きすぎます（最大{MAX_FILE_SIZE_MB}MB）")
                    continue

                # PDF情報抽出
                data = pdf_service.extract_from_pdf(temp_path)

                # 複数ファイルの場合は後のファイルが優先
                extracted_data.update(data)

            except Exception as e:
                errors.append(f"'{file.filename}' の処理に失敗しました: {str(e)}")

    # 抽出エラーキーを削除
    extracted_data.pop('_extraction_error', None)

    if not extracted_data and errors:
        return jsonify({
            'error': 'PDF抽出に失敗しました',
            'details': errors
        }), 422

    return jsonify({
        'status': 'success',
        'extracted_data': extracted_data,
        'warnings': errors if errors else None
    }), 200


@pdf_bp.route('/parse-text', methods=['POST'])
@jwt_required()
def parse_text():
    """
    テキストから契約情報を解析（PDFを介さず直接テキスト入力）

    Request body:
        text: 解析するテキスト（NotebookLMテキスト等）

    Returns:
        JSON: 解析した情報
    """
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'テキストが指定されていません'}), 400

    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'テキストが空です'}), 400

    try:
        pdf_service = PDFService()
        parsed = pdf_service.parse_text(text)

        return jsonify({
            'status': 'success',
            'extracted_data': parsed
        }), 200

    except Exception as e:
        return jsonify({
            'error': 'テキスト解析に失敗しました',
            'message': str(e)
        }), 500
