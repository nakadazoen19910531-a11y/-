"""
過去事例（施工計画書）管理サービス - デュアルモード実装

SUPABASE_URL / SUPABASE_KEY が設定されている場合: Supabase PostgreSQL を使用
（ファイルデータは base64 エンコードして file_data_b64 カラムに保存）
未設定の場合: JSON ファイル + ローカルファイルシステムによるフォールバック
"""
import base64
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any


# JSON フォールバック用データディレクトリ
_BASE_DIR = Path(__file__).parent.parent / 'data' / 'past_cases'


class PastCaseService:
    """過去事例 DOCX の CRUD を管理するサービス（Supabase優先 / JSONフォールバック）"""

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
                json.dumps({'past_cases': []}, ensure_ascii=False, indent=2),
                encoding='utf-8'
            )

    def _load_metadata(self) -> Dict[str, Any]:
        try:
            return json.loads(self.metadata_file.read_text(encoding='utf-8'))
        except Exception:
            return {'past_cases': []}

    def _save_metadata(self, past_cases: List[Dict]) -> None:
        self.metadata_file.write_text(
            json.dumps({'past_cases': past_cases}, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )

    # ─── 一覧取得 ─────────────────────────────────────────────────────────────

    def get_all(self) -> List[Dict]:
        """全過去事例のメタデータ一覧を返す（ファイルデータは除外）"""
        if self._sb:
            try:
                res = (
                    self._sb.table('past_cases')
                    .select('id, name, description, project_type, client, location, year, original_filename, file_size, created_at, uploaded_by, storage_path')
                    .order('created_at', desc=True)
                    .execute()
                )
                return [self._normalize(p, file_exists=True) for p in (res.data or [])]
            except Exception as e:
                print(f'Supabase get_all 過去事例エラー: {e}')
                return []

        # JSON fallback
        past_cases = self._load_metadata().get('past_cases', [])
        result = []
        for p in past_cases:
            file_path = self.files_dir / f"{p['id']}.docx"
            p['file_exists'] = file_path.exists()
            result.append(p)
        return result

    # ─── 単件取得 ─────────────────────────────────────────────────────────────

    def get_by_id(self, case_id: str) -> Optional[Dict]:
        """指定 ID の過去事例メタデータを返す（ファイルデータは除外）"""
        if self._sb:
            try:
                res = (
                    self._sb.table('past_cases')
                    .select('id, name, description, project_type, client, location, year, original_filename, file_size, created_at, uploaded_by, storage_path')
                    .eq('id', case_id)
                    .execute()
                )
                return self._normalize(res.data[0]) if res.data else None
            except Exception as e:
                print(f'Supabase get_by_id 過去事例エラー: {e}')
                return None

        # JSON fallback
        past_cases = self._load_metadata().get('past_cases', [])
        return next((p for p in past_cases if p['id'] == case_id), None)

    def get_file_bytes(self, case_id: str) -> Optional[bytes]:
        """過去事例のファイルバイト列を返す（ダウンロード用）"""
        if self._sb:
            try:
                res = (
                    self._sb.table('past_cases')
                    .select('storage_path, file_data_b64')
                    .eq('id', case_id)
                    .execute()
                )
                if not res.data:
                    return None
                row = res.data[0]

                # 1) Storage 優先
                storage_path = row.get('storage_path')
                if storage_path:
                    from services import storage_service
                    data = storage_service.download(storage_path)
                    if data is not None:
                        return data

                # 2) フォールバック: base64
                b64 = row.get('file_data_b64')
                if b64:
                    return base64.b64decode(b64)
                return None
            except Exception as e:
                print(f'Supabase get_file_bytes 過去事例エラー: {e}')
                return None

        # JSON fallback
        file_path = self.files_dir / f'{case_id}.docx'
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
        project_type: str = '',
        client: str = '',
        location: str = '',
        year: str = '',
        uploaded_by: str = '',
    ) -> Dict:
        """過去事例を保存してメタデータを返す"""
        case_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + 'Z'
        file_size = len(file_bytes)

        if self._sb:
            try:
                # 1) Supabase Storage にアップロード
                from services import storage_service
                storage_path = storage_service.upload(
                    category='past-cases',
                    file_id=case_id,
                    file_bytes=file_bytes,
                    filename_ext='.docx',
                    content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                )

                row = {
                    'id': case_id,
                    'name': name,
                    'description': description,
                    'project_type': project_type,
                    'client': client,
                    'location': location,
                    'year': year,
                    'original_filename': original_filename,
                    'file_size': file_size,
                    'created_at': now,
                    'uploaded_by': uploaded_by,
                    'storage_path': storage_path,
                }
                # Storage 失敗時は base64 フォールバック
                if not storage_path:
                    print('⚠️ Storage アップロード失敗 → base64 で保存')
                    row['file_data_b64'] = base64.b64encode(file_bytes).decode('ascii')

                self._sb.table('past_cases').insert(row).execute()
                return self._normalize(row, file_exists=True)
            except Exception as e:
                raise Exception(f'過去事例の保存に失敗しました: {e}')

        # JSON fallback
        file_path = self.files_dir / f'{case_id}.docx'
        file_path.write_bytes(file_bytes)

        case_meta: Dict = {
            'id': case_id,
            'name': name,
            'description': description,
            'project_type': project_type,
            'client': client,
            'location': location,
            'year': year,
            'original_filename': original_filename,
            'created_at': now,
            'size': file_size,
            'uploaded_by': uploaded_by,
            'file_exists': True,
        }
        past_cases = self._load_metadata().get('past_cases', [])
        past_cases.append({k: v for k, v in case_meta.items() if k != 'file_exists'})
        self._save_metadata(past_cases)
        return case_meta

    # ─── 削除 ──────────────────────────────────────────────────────────────────

    def delete(self, case_id: str) -> bool:
        """過去事例を削除する。成功なら True。Storage上のファイルも削除する。"""
        if self._sb:
            try:
                # 1) Storage 上のファイルを削除
                try:
                    res_fetch = (
                        self._sb.table('past_cases')
                        .select('storage_path')
                        .eq('id', case_id)
                        .execute()
                    )
                    if res_fetch.data and res_fetch.data[0].get('storage_path'):
                        from services import storage_service
                        storage_service.delete(res_fetch.data[0]['storage_path'])
                except Exception as e:
                    print(f'⚠️ Storage削除失敗（DBは削除続行）: {e}')

                # 2) DB行削除
                res = (
                    self._sb.table('past_cases')
                    .delete()
                    .eq('id', case_id)
                    .execute()
                )
                return bool(res.data)
            except Exception as e:
                print(f'Supabase delete 過去事例エラー: {e}')
                return False

        # JSON fallback
        past_cases = self._load_metadata().get('past_cases', [])
        if not any(p['id'] == case_id for p in past_cases):
            return False
        file_path = self.files_dir / f'{case_id}.docx'
        if file_path.exists():
            file_path.unlink()
        past_cases = [p for p in past_cases if p['id'] != case_id]
        self._save_metadata(past_cases)
        return True

    # ─── ヘルパー ─────────────────────────────────────────────────────────────

    def _normalize(self, row: dict, file_exists: bool = True) -> Dict:
        """Supabase 行データをフロントエンド向けフォーマットに変換"""
        return {
            'id': row.get('id', ''),
            'name': row.get('name', ''),
            'description': row.get('description', ''),
            'project_type': row.get('project_type', ''),
            'client': row.get('client', ''),
            'location': row.get('location', ''),
            'year': row.get('year', ''),
            'original_filename': row.get('original_filename', ''),
            'size': row.get('file_size', row.get('size', 0)),
            'created_at': row.get('created_at', ''),
            'uploaded_by': row.get('uploaded_by', ''),
            'storage_path': row.get('storage_path'),
            'file_exists': file_exists,
        }
