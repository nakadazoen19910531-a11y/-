"""
設計図書管理サービス - デュアルモード実装

公共工事の設計図書（契約書・図面・仕様書・数量計算書等）を保管する。
施工計画書作成時に最も重要な参照資料となる。

SUPABASE_URL / SUPABASE_KEY が設定されている場合: Supabase PostgreSQL を使用
（ファイルデータは base64 エンコードして file_data_b64 カラムに保存）
未設定の場合: JSON ファイル + ローカルファイルシステムによるフォールバック

対応ファイル形式: PDF / DOCX / XLSX / ZIP
"""
import base64
import json
import os
import uuid
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any


# JSON フォールバック用データディレクトリ
_BASE_DIR = Path(__file__).parent.parent / 'data' / 'design_documents'

# 対応MIMEタイプマッピング
_EXT_TO_MIME = {
    '.pdf':  'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc':  'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls':  'application/vnd.ms-excel',
    '.zip':  'application/zip',
}


def guess_mime_type(filename: str) -> str:
    """ファイル名から MIME タイプを推定"""
    ext = Path(filename).suffix.lower()
    if ext in _EXT_TO_MIME:
        return _EXT_TO_MIME[ext]
    mime, _ = mimetypes.guess_type(filename)
    return mime or 'application/octet-stream'


class DesignDocumentService:
    """設計図書 CRUD を管理するサービス（Supabase優先 / JSONフォールバック）"""

    def __init__(self, data_dir: Optional[Path] = None):
        from db.supabase_client import get_client
        self._sb = get_client()

        if not self._sb:
            # JSON フォールバックモード
            self.data_dir = data_dir or _BASE_DIR
            self.files_dir = self.data_dir / 'files'
            self.metadata_file = self.data_dir / 'metadata.json'
            self.data_dir.mkdir(parents=True, exist_ok=True)
            self.files_dir.mkdir(parents=True, exist_ok=True)
            self._init_metadata()

    # ─── JSON フォールバック 初期化 ────────────────────────────────────────────
    def _init_metadata(self) -> None:
        if not self.metadata_file.exists():
            self.metadata_file.write_text(
                json.dumps({'design_documents': []}, ensure_ascii=False, indent=2),
                encoding='utf-8'
            )

    def _load_metadata(self) -> Dict[str, Any]:
        try:
            return json.loads(self.metadata_file.read_text(encoding='utf-8'))
        except Exception:
            return {'design_documents': []}

    def _save_metadata(self, docs: List[Dict]) -> None:
        self.metadata_file.write_text(
            json.dumps({'design_documents': docs}, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )

    # ─── 一覧取得 ─────────────────────────────────────────────────────────────

    def get_all(self) -> List[Dict]:
        """全設計図書のメタデータ一覧を返す（ファイルデータは除外）"""
        if self._sb:
            try:
                res = (
                    self._sb.table('design_documents')
                    .select('id, name, description, document_type, project_name, client, location, year, original_filename, mime_type, file_size, created_at, uploaded_by')
                    .order('created_at', desc=True)
                    .execute()
                )
                return [self._normalize(d, file_exists=True) for d in (res.data or [])]
            except Exception as e:
                print(f'Supabase get_all 設計図書エラー: {e}')
                return []

        # JSON fallback
        docs = self._load_metadata().get('design_documents', [])
        result = []
        for d in docs:
            ext = Path(d.get('original_filename', '')).suffix.lower() or '.dat'
            file_path = self.files_dir / f"{d['id']}{ext}"
            d['file_exists'] = file_path.exists()
            result.append(d)
        return result

    # ─── 単件取得 ─────────────────────────────────────────────────────────────

    def get_by_id(self, doc_id: str) -> Optional[Dict]:
        """指定 ID の設計図書メタデータを返す（ファイルデータは除外）"""
        if self._sb:
            try:
                res = (
                    self._sb.table('design_documents')
                    .select('id, name, description, document_type, project_name, client, location, year, original_filename, mime_type, file_size, created_at, uploaded_by')
                    .eq('id', doc_id)
                    .execute()
                )
                return self._normalize(res.data[0]) if res.data else None
            except Exception as e:
                print(f'Supabase get_by_id 設計図書エラー: {e}')
                return None

        # JSON fallback
        docs = self._load_metadata().get('design_documents', [])
        return next((d for d in docs if d['id'] == doc_id), None)

    def get_file_bytes(self, doc_id: str) -> Optional[bytes]:
        """設計図書のファイルバイト列を返す（ダウンロード用）"""
        if self._sb:
            try:
                res = (
                    self._sb.table('design_documents')
                    .select('file_data_b64')
                    .eq('id', doc_id)
                    .execute()
                )
                if not res.data or not res.data[0].get('file_data_b64'):
                    return None
                return base64.b64decode(res.data[0]['file_data_b64'])
            except Exception as e:
                print(f'Supabase get_file_bytes 設計図書エラー: {e}')
                return None

        # JSON fallback
        meta = self.get_by_id(doc_id)
        if not meta:
            return None
        ext = Path(meta.get('original_filename', '')).suffix.lower() or '.dat'
        file_path = self.files_dir / f'{doc_id}{ext}'
        if file_path.exists():
            return file_path.read_bytes()
        return None

    # ─── 保存 ──────────────────────────────────────────────────────────────────

    def save(
        self,
        name: str,
        description: str,
        file_bytes: bytes,
        original_filename: str,
        document_type: str = '',
        project_name: str = '',
        client: str = '',
        location: str = '',
        year: str = '',
        uploaded_by: str = '',
    ) -> Dict:
        """設計図書を保存してメタデータを返す"""
        doc_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + 'Z'
        file_size = len(file_bytes)
        mime_type = guess_mime_type(original_filename)

        if self._sb:
            try:
                row = {
                    'id': doc_id,
                    'name': name,
                    'description': description,
                    'document_type': document_type,
                    'project_name': project_name,
                    'client': client,
                    'location': location,
                    'year': year,
                    'original_filename': original_filename,
                    'mime_type': mime_type,
                    'file_data_b64': base64.b64encode(file_bytes).decode('ascii'),
                    'file_size': file_size,
                    'created_at': now,
                    'uploaded_by': uploaded_by,
                }
                self._sb.table('design_documents').insert(row).execute()
                return self._normalize(row, file_exists=True)
            except Exception as e:
                raise Exception(f'設計図書の保存に失敗しました: {e}')

        # JSON fallback
        ext = Path(original_filename).suffix.lower() or '.dat'
        file_path = self.files_dir / f'{doc_id}{ext}'
        file_path.write_bytes(file_bytes)

        doc_meta: Dict = {
            'id': doc_id,
            'name': name,
            'description': description,
            'document_type': document_type,
            'project_name': project_name,
            'client': client,
            'location': location,
            'year': year,
            'original_filename': original_filename,
            'mime_type': mime_type,
            'created_at': now,
            'size': file_size,
            'uploaded_by': uploaded_by,
            'file_exists': True,
        }
        docs = self._load_metadata().get('design_documents', [])
        docs.append({k: v for k, v in doc_meta.items() if k != 'file_exists'})
        self._save_metadata(docs)
        return doc_meta

    # ─── 削除 ──────────────────────────────────────────────────────────────────

    def delete(self, doc_id: str) -> bool:
        """設計図書を削除する。成功なら True"""
        if self._sb:
            try:
                res = (
                    self._sb.table('design_documents')
                    .delete()
                    .eq('id', doc_id)
                    .execute()
                )
                return bool(res.data)
            except Exception as e:
                print(f'Supabase delete 設計図書エラー: {e}')
                return False

        # JSON fallback
        docs = self._load_metadata().get('design_documents', [])
        target = next((d for d in docs if d['id'] == doc_id), None)
        if not target:
            return False
        ext = Path(target.get('original_filename', '')).suffix.lower() or '.dat'
        file_path = self.files_dir / f'{doc_id}{ext}'
        if file_path.exists():
            file_path.unlink()
        docs = [d for d in docs if d['id'] != doc_id]
        self._save_metadata(docs)
        return True

    # ─── ヘルパー ─────────────────────────────────────────────────────────────

    def _normalize(self, row: dict, file_exists: bool = True) -> Dict:
        """Supabase 行データをフロントエンド向けフォーマットに変換"""
        return {
            'id': row.get('id', ''),
            'name': row.get('name', ''),
            'description': row.get('description', ''),
            'document_type': row.get('document_type', ''),
            'project_name': row.get('project_name', ''),
            'client': row.get('client', ''),
            'location': row.get('location', ''),
            'year': row.get('year', ''),
            'original_filename': row.get('original_filename', ''),
            'mime_type': row.get('mime_type', 'application/octet-stream'),
            'size': row.get('file_size', row.get('size', 0)),
            'created_at': row.get('created_at', ''),
            'uploaded_by': row.get('uploaded_by', ''),
            'file_exists': file_exists,
        }
