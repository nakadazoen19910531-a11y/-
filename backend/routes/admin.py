"""
管理者専用エンドポイント
データ移行や保守作業用の API
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import UserModel

admin_bp = Blueprint('admin', __name__)


def _is_admin(user_id: str) -> bool:
    """ユーザーが管理者かどうかを確認する"""
    try:
        user_model = UserModel()
        user = user_model.find_by_id(user_id)
        return user is not None and user.get('role') == 'admin'
    except Exception:
        return False


@admin_bp.route('/migrate-supabase-to-r2', methods=['POST'])
@jwt_required()
def migrate_supabase_to_r2():
    """
    Supabase Storage 上の全ファイルを Cloudflare R2 にコピーする。
    storage_path はそのまま流用可（同じパス形式）。
    既存の Supabase ファイルは削除しない（手動確認後に削除可能）。

    必須環境変数:
      - R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
      - SUPABASE_URL, SUPABASE_KEY
    """
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': '管理者のみ実行できます'}), 403

    import os
    from db.supabase_client import get_client

    # ─── 環境変数チェック ───────────────────────────────────────────
    r2_endpoint = os.getenv('R2_ENDPOINT_URL', '').strip()
    r2_key = os.getenv('R2_ACCESS_KEY_ID', '').strip()
    r2_secret = os.getenv('R2_SECRET_ACCESS_KEY', '').strip()
    r2_bucket = os.getenv('R2_BUCKET', 'sekoplan-files').strip()
    sb_url = os.getenv('SUPABASE_URL', '').strip().rstrip('/')
    sb_key = (os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY') or '').strip()

    if not (r2_endpoint and r2_key and r2_secret and r2_bucket):
        return jsonify({'error': 'R2 環境変数が未設定'}), 400
    if not (sb_url and sb_key):
        return jsonify({'error': 'Supabase 環境変数が未設定'}), 400

    # ─── boto3 R2 クライアント ──────────────────────────────────────
    try:
        import boto3
        from botocore.config import Config
        r2 = boto3.client(
            's3',
            endpoint_url=r2_endpoint,
            aws_access_key_id=r2_key,
            aws_secret_access_key=r2_secret,
            region_name='auto',
            config=Config(signature_version='s3v4'),
        )
    except Exception as e:
        return jsonify({'error': 'R2 接続失敗', 'message': str(e)}), 500

    # ─── 移行対象を全テーブルから収集 ────────────────────────────
    sb = get_client()
    if not sb:
        return jsonify({'error': 'Supabase クライアント取得失敗'}), 500

    targets = []
    for table in ['templates', 'past_cases', 'design_documents', 'plans']:
        try:
            res = (
                sb.table(table)
                .select('id, storage_path')
                .not_.is_('storage_path', 'null')
                .execute()
            )
            for row in (res.data or []):
                targets.append({
                    'table': table,
                    'id': row['id'],
                    'storage_path': row['storage_path'],
                })
        except Exception as e:
            print(f'⚠️ {table} 取得失敗: {e}')

    # ─── 順次移行（Supabase からダウンロード → R2 にアップロード） ─
    import requests
    sb_headers = {'apikey': sb_key, 'Authorization': f'Bearer {sb_key}'}
    sb_bucket = os.getenv('SUPABASE_STORAGE_BUCKET', 'sekoplan-files')

    results = {'success': 0, 'skipped': 0, 'failed': 0, 'details': []}

    for t in targets:
        sp = t['storage_path']
        # 既に R2 にあるかチェック
        try:
            r2.head_object(Bucket=r2_bucket, Key=sp)
            results['skipped'] += 1
            results['details'].append({'path': sp, 'status': 'already_in_r2'})
            continue
        except Exception:
            pass  # Not in R2, proceed

        # Supabase からダウンロード
        try:
            r = requests.get(
                f'{sb_url}/storage/v1/object/{sb_bucket}/{sp}',
                headers=sb_headers,
                timeout=300,
            )
            if r.status_code != 200:
                results['failed'] += 1
                results['details'].append({
                    'path': sp,
                    'status': 'sb_download_failed',
                    'http': r.status_code,
                })
                continue
            file_bytes = r.content
        except Exception as e:
            results['failed'] += 1
            results['details'].append({'path': sp, 'status': 'sb_exception', 'error': str(e)})
            continue

        # R2 へアップロード
        try:
            # Content-Type は推測（拡張子ベース）
            ct = 'application/octet-stream'
            if sp.endswith('.pdf'): ct = 'application/pdf'
            elif sp.endswith('.docx'): ct = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            elif sp.endswith('.xlsx'): ct = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            elif sp.endswith('.zip'): ct = 'application/zip'

            r2.put_object(Bucket=r2_bucket, Key=sp, Body=file_bytes, ContentType=ct)
            results['success'] += 1
            results['details'].append({
                'path': sp,
                'status': 'ok',
                'size': len(file_bytes),
            })
        except Exception as e:
            results['failed'] += 1
            results['details'].append({'path': sp, 'status': 'r2_upload_failed', 'error': str(e)})

    return jsonify({
        'status': 'completed',
        'total_targets': len(targets),
        **results,
    }), 200


@admin_bp.route('/storage-status', methods=['GET'])
@jwt_required()
def storage_status():
    """現在のストレージバックエンドを返す（デバッグ用）"""
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': '管理者のみ実行できます'}), 403

    from services import storage_service
    return jsonify({
        'backend': storage_service.get_backend(),
        'is_available': storage_service.is_available(),
    }), 200
