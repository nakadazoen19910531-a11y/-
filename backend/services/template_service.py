"""
テンプレート管理サービス
DOCX テンプレートのアップロード・一覧・削除・プレースホルダー置換を管理する
"""
import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any


# データディレクトリ（このファイルから2階層上の data/templates/）
_BASE_DIR = Path(__file__).parent.parent / 'data' / 'templates'


class TemplateService:
    """DOCX テンプレートの CRUD を JSON ファイルベースで管理するサービス"""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or _BASE_DIR
        self.files_dir = self.data_dir / 'files'
        self.metadata_file = self.data_dir / 'metadata.json'

        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.files_dir.mkdir(parents=True, exist_ok=True)
        self._init_metadata()

    # ─── 初期化 ────────────────────────────────────────────────────────────────
    def _init_metadata(self) -> None:
        if not self.metadata_file.exists():
            self.metadata_file.write_text(
                json.dumps({"templates": []}, ensure_ascii=False, indent=2),
                encoding='utf-8'
            )

    def _load_metadata(self) -> Dict[str, Any]:
        try:
            return json.loads(self.metadata_file.read_text(encoding='utf-8'))
        except Exception:
            return {"templates": []}

    def _save_metadata(self, templates: List[Dict]) -> None:
        data = {"templates": templates}
        self.metadata_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )

    # ─── 一覧・取得 ────────────────────────────────────────────────────────────
    def get_all(self) -> List[Dict]:
        """全テンプレートのメタデータ一覧を返す"""
        templates = self._load_metadata().get('templates', [])
        # ファイルが実際に存在するものだけ返す
        result = []
        for t in templates:
            file_path = self.files_dir / f"{t['id']}.docx"
            t['file_exists'] = file_path.exists()
            result.append(t)
        return result

    def get_by_id(self, template_id: str) -> Optional[Dict]:
        """指定 ID のテンプレートメタデータを返す"""
        templates = self._load_metadata().get('templates', [])
        return next((t for t in templates if t['id'] == template_id), None)

    def get_file_path(self, template_id: str) -> Path:
        """テンプレートファイルのパスを返す（存在しなくても返す）"""
        return self.files_dir / f"{template_id}.docx"

    # ─── 保存 ──────────────────────────────────────────────────────────────────
    def save(
        self,
        name: str,
        description: str,
        file_bytes: bytes,
        original_filename: str
    ) -> Dict:
        """テンプレートを保存してメタデータを返す"""
        templates = self._load_metadata().get('templates', [])

        template_id = str(uuid.uuid4())
        file_path = self.files_dir / f"{template_id}.docx"
        file_path.write_bytes(file_bytes)

        template: Dict = {
            'id': template_id,
            'name': name,
            'description': description,
            'original_filename': original_filename,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'size': len(file_bytes),
            'file_exists': True,
        }
        templates.append({k: v for k, v in template.items() if k != 'file_exists'})
        self._save_metadata(templates)
        return template

    # ─── 削除 ──────────────────────────────────────────────────────────────────
    def delete(self, template_id: str) -> bool:
        """テンプレートを削除する。成功なら True"""
        templates = self._load_metadata().get('templates', [])
        if not any(t['id'] == template_id for t in templates):
            return False

        file_path = self.files_dir / f"{template_id}.docx"
        if file_path.exists():
            file_path.unlink()

        templates = [t for t in templates if t['id'] != template_id]
        self._save_metadata(templates)
        return True

    # ─── プレースホルダー置換 ──────────────────────────────────────────────────
    def apply_template(self, template_id: str, data: dict, output_path: Path) -> bool:
        """
        テンプレート DOCX のプレースホルダーをデータで置換して output_path に保存する。
        プレースホルダー形式: {{フィールド名}} または {{projectName}} 等
        成功なら True、失敗なら False を返す。
        """
        try:
            from docx import Document
        except ImportError:
            return False

        file_path = self.get_file_path(template_id)
        if not file_path.exists():
            return False

        try:
            doc = Document(str(file_path))
        except Exception:
            return False

        # 置換マッピング（英語キーと日本語キーの両方に対応）
        replacements = self._build_replacements(data)

        # 段落のプレースホルダーを置換
        for paragraph in doc.paragraphs:
            self._replace_in_paragraph(paragraph, replacements)

        # テーブル内のプレースホルダーを置換
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        self._replace_in_paragraph(paragraph, replacements)

        # ヘッダー・フッター内も置換
        for section in doc.sections:
            for header_footer in [section.header, section.footer]:
                if header_footer:
                    for paragraph in header_footer.paragraphs:
                        self._replace_in_paragraph(paragraph, replacements)

        doc.save(str(output_path))
        return True

    def _build_replacements(self, data: dict) -> Dict[str, str]:
        """フォームデータからプレースホルダー置換マッピングを構築する"""
        field_map = {
            'projectName':    ['projectName', '工事名', '工事件名'],
            'projectType':    ['projectType', '工事種別'],
            'contractNumber': ['contractNumber', '契約番号'],
            'location':       ['location', '工事場所'],
            'startDate':      ['startDate', '工期始期', '着工日'],
            'endDate':        ['endDate', '工期終期', '竣工日'],
            'contractAmount': ['contractAmount', '契約金額'],
            'client':         ['client', '発注者'],
            'contractor':     ['contractor', '受注者'],
        }
        replacements: Dict[str, str] = {}
        for field_key, placeholder_keys in field_map.items():
            value = data.get(field_key, '')
            for pk in placeholder_keys:
                replacements[f'{{{{{pk}}}}}'] = value  # {{key}}
        return replacements

    def _replace_in_paragraph(self, paragraph, replacements: Dict[str, str]) -> None:
        """段落内のプレースホルダーをテキスト置換する（run をまたぐ場合にも対応）"""
        # まずフル文字列で置換を試みる
        full_text = ''.join(run.text for run in paragraph.runs)
        new_text = full_text
        for placeholder, value in replacements.items():
            new_text = new_text.replace(placeholder, value)

        if new_text == full_text:
            return  # 変更なし

        # run[0] に全テキストを入れ、残りをクリア
        if paragraph.runs:
            paragraph.runs[0].text = new_text
            for run in paragraph.runs[1:]:
                run.text = ''
