"""
施工計画書管理サービス - デュアルモード実装

SUPABASE_URL / SUPABASE_KEY が設定されている場合: Supabase PostgreSQL を使用
未設定の場合: JSON ファイルによるローカルフォールバック
"""
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional


class PlanService:
    """施工計画書データの管理クラス（Supabase優先 / JSONフォールバック）"""

    def __init__(self):
        from db.supabase_client import get_client
        self._sb = get_client()

        if not self._sb:
            # JSON フォールバックモード
            self.data_dir = Path(os.path.dirname(__file__)) / '..' / 'data' / 'plans'
            self.data_dir.mkdir(parents=True, exist_ok=True)

    # ─── 一覧取得 ─────────────────────────────────────────────────────────────

    def get_user_plans(self, user_id: str) -> list:
        """ユーザーの全施工計画書を取得（作成日時の降順）"""
        if self._sb:
            try:
                res = (
                    self._sb.table('plans')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('created_at', desc=True)
                    .execute()
                )
                return [self._normalize_plan(p) for p in (res.data or [])]
            except Exception as e:
                print(f'Supabase get_user_plans エラー: {e}')
                return []

        # JSON fallback
        user_dir = self.data_dir / user_id
        plans = []
        if not user_dir.exists():
            return plans
        try:
            for json_file in user_dir.glob('*.json'):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        plan = json.load(f)
                    plans.append(self._enrich_plan(plan))
                except (json.JSONDecodeError, KeyError):
                    continue
            plans.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            return plans
        except Exception as e:
            raise Exception(f'計画書一覧の取得に失敗しました: {str(e)}')

    # ─── 単件取得 ─────────────────────────────────────────────────────────────

    def get_plan(self, plan_id: str, user_id: str) -> Optional[dict]:
        """指定IDの計画書を取得"""
        if self._sb:
            try:
                res = (
                    self._sb.table('plans')
                    .select('*')
                    .eq('id', plan_id)
                    .eq('user_id', user_id)
                    .execute()
                )
                return self._normalize_plan(res.data[0]) if res.data else None
            except Exception as e:
                print(f'Supabase get_plan エラー: {e}')
                return None

        # JSON fallback
        try:
            plan_file = self.data_dir / user_id / f'{plan_id}.json'
            if not plan_file.exists():
                return None
            with open(plan_file, 'r', encoding='utf-8') as f:
                plan = json.load(f)
            return self._enrich_plan(plan)
        except Exception as e:
            raise Exception(f'計画書の取得に失敗しました: {str(e)}')

    # ─── 保存 ─────────────────────────────────────────────────────────────────

    def save_plan(self, user_id: str, data: dict, file_path: str) -> dict:
        """計画書メタデータを保存して返す"""
        plan_id = str(uuid.uuid4())
        filename = Path(file_path).name if file_path else 'unknown.docx'

        file_size = 0
        if file_path and Path(file_path).exists():
            file_size = Path(file_path).stat().st_size

        now = datetime.now().isoformat()

        if self._sb:
            try:
                row = {
                    'id': plan_id,
                    'user_id': user_id,
                    'filename': filename,
                    'file_path': str(file_path),
                    'file_size': file_size,
                    'status': 'completed',
                    'created_at': now,
                    'updated_at': now,
                    'project_name': data.get('projectName', ''),
                    'project_type': data.get('projectType', ''),
                    'contract_number': data.get('contractNumber', ''),
                    'location': data.get('location', ''),
                    'start_date': data.get('startDate', ''),
                    'end_date': data.get('endDate', ''),
                    'contract_amount': data.get('contractAmount', ''),
                    'client': data.get('client', ''),
                    'contractor': data.get('contractor', ''),
                    'full_data': json.dumps(data, ensure_ascii=False),
                }
                self._sb.table('plans').insert(row).execute()
                return self._normalize_plan(row)
            except Exception as e:
                raise Exception(f'計画書の保存に失敗しました: {e}')

        # JSON fallback
        try:
            user_dir = self.data_dir / user_id
            user_dir.mkdir(parents=True, exist_ok=True)

            plan = {
                'id': plan_id,
                'user_id': user_id,
                'filename': filename,
                'file_path': str(file_path),
                'file_size': file_size,
                'status': 'completed',
                'created_at': now,
                'updated_at': now,
                'projectName': data.get('projectName', ''),
                'projectType': data.get('projectType', ''),
                'contractNumber': data.get('contractNumber', ''),
                'location': data.get('location', ''),
                'startDate': data.get('startDate', ''),
                'endDate': data.get('endDate', ''),
                'contractAmount': data.get('contractAmount', ''),
                'client': data.get('client', ''),
                'contractor': data.get('contractor', ''),
                'data': data,
            }
            plan_file = user_dir / f'{plan_id}.json'
            with open(plan_file, 'w', encoding='utf-8') as f:
                json.dump(plan, f, ensure_ascii=False, indent=2)
            return plan
        except Exception as e:
            raise Exception(f'計画書の保存に失敗しました: {str(e)}')

    # ─── 削除 ─────────────────────────────────────────────────────────────────

    def delete_plan(self, plan_id: str, user_id: str) -> bool:
        """計画書を削除"""
        if self._sb:
            try:
                res = (
                    self._sb.table('plans')
                    .delete()
                    .eq('id', plan_id)
                    .eq('user_id', user_id)
                    .execute()
                )
                return bool(res.data)
            except Exception as e:
                print(f'Supabase delete_plan エラー: {e}')
                return False

        # JSON fallback
        try:
            plan_file = self.data_dir / user_id / f'{plan_id}.json'
            if not plan_file.exists():
                return False
            with open(plan_file, 'r', encoding='utf-8') as f:
                plan = json.load(f)
            plan_file.unlink()
            docx_path = plan.get('file_path')
            if docx_path and Path(docx_path).exists():
                Path(docx_path).unlink()
            return True
        except Exception as e:
            raise Exception(f'計画書の削除に失敗しました: {str(e)}')

    # ─── 更新 ─────────────────────────────────────────────────────────────────

    def update_plan(self, plan_id: str, user_id: str, data: dict) -> Optional[dict]:
        """計画書データを更新"""
        updatable_json = {
            'projectName', 'projectType', 'contractNumber',
            'location', 'startDate', 'endDate',
            'contractAmount', 'client', 'contractor', 'status'
        }
        # Supabase カラム名マッピング
        json_to_db = {
            'projectName': 'project_name',
            'projectType': 'project_type',
            'contractNumber': 'contract_number',
            'location': 'location',
            'startDate': 'start_date',
            'endDate': 'end_date',
            'contractAmount': 'contract_amount',
            'client': 'client',
            'contractor': 'contractor',
            'status': 'status',
        }

        if self._sb:
            try:
                updates = {
                    json_to_db[k]: v
                    for k, v in data.items()
                    if k in json_to_db
                }
                updates['updated_at'] = datetime.now().isoformat()
                res = (
                    self._sb.table('plans')
                    .update(updates)
                    .eq('id', plan_id)
                    .eq('user_id', user_id)
                    .execute()
                )
                return self._normalize_plan(res.data[0]) if res.data else None
            except Exception as e:
                raise Exception(f'計画書の更新に失敗しました: {e}')

        # JSON fallback
        plan = self.get_plan(plan_id, user_id)
        if not plan:
            return None
        try:
            for key, value in data.items():
                if key in updatable_json:
                    plan[key] = value
                    if 'data' in plan:
                        plan['data'][key] = value
            plan['updated_at'] = datetime.now().isoformat()
            plan_file = self.data_dir / user_id / f'{plan_id}.json'
            with open(plan_file, 'w', encoding='utf-8') as f:
                json.dump(plan, f, ensure_ascii=False, indent=2)
            return plan
        except Exception as e:
            raise Exception(f'計画書の更新に失敗しました: {str(e)}')

    # ─── ヘルパー ─────────────────────────────────────────────────────────────

    def _normalize_plan(self, row: dict) -> dict:
        """
        Supabase の snake_case カラムを camelCase に変換し、
        JSON fallback と共通のフォーマットにする
        """
        full_data = {}
        if row.get('full_data'):
            try:
                full_data = json.loads(row['full_data'])
            except Exception:
                pass

        return {
            'id': row.get('id', ''),
            'user_id': row.get('user_id', ''),
            'filename': row.get('filename', ''),
            'file_path': row.get('file_path', ''),
            'file_size': row.get('file_size', 0),
            'file_exists': bool(row.get('file_path') and Path(row.get('file_path', '')).exists()),
            'status': row.get('status', 'completed'),
            'created_at': row.get('created_at', ''),
            'updated_at': row.get('updated_at', ''),
            'projectName': row.get('project_name', '') or row.get('projectName', ''),
            'projectType': row.get('project_type', '') or row.get('projectType', ''),
            'contractNumber': row.get('contract_number', '') or row.get('contractNumber', ''),
            'location': row.get('location', ''),
            'startDate': row.get('start_date', '') or row.get('startDate', ''),
            'endDate': row.get('end_date', '') or row.get('endDate', ''),
            'contractAmount': row.get('contract_amount', '') or row.get('contractAmount', ''),
            'client': row.get('client', ''),
            'contractor': row.get('contractor', ''),
            'data': full_data or row.get('data', {}),
        }

    def _enrich_plan(self, plan: dict) -> dict:
        """JSON fallback 用: ファイル存在チェック情報を付加"""
        file_path = plan.get('file_path')
        plan['file_exists'] = bool(file_path and Path(file_path).exists())
        if plan['file_exists']:
            plan['file_size'] = Path(file_path).stat().st_size
        return plan
