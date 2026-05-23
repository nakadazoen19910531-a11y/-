"""
施工計画書管理サービス
生成した計画書のCRUD操作とメタデータ管理
"""
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
import uuid


class PlanService:
    """施工計画書データの管理クラス"""

    def __init__(self):
        """サービスを初期化"""
        self.data_dir = Path(os.path.dirname(__file__)) / '..' / 'data' / 'plans'
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def get_user_plans(self, user_id: str) -> list:
        """
        ユーザーの全施工計画書を取得

        Args:
            user_id: ユーザーID

        Returns:
            計画書リスト（作成日時の降順）
        """
        user_dir = self.data_dir / user_id
        plans = []

        if not user_dir.exists():
            return plans

        try:
            for json_file in user_dir.glob('*.json'):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        plan = json.load(f)
                        # ファイルサイズを更新
                        plan = self._enrich_plan(plan)
                        plans.append(plan)
                except (json.JSONDecodeError, KeyError):
                    continue

            # 作成日時の降順でソート
            plans.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            return plans

        except Exception as e:
            raise Exception(f"計画書一覧の取得に失敗しました: {str(e)}")

    def get_plan(self, plan_id: str, user_id: str) -> Optional[dict]:
        """
        指定IDの計画書を取得

        Args:
            plan_id: 計画書ID
            user_id: ユーザーID

        Returns:
            計画書データ（存在しない場合はNone）
        """
        try:
            plan_file = self.data_dir / user_id / f'{plan_id}.json'
            if not plan_file.exists():
                return None

            with open(plan_file, 'r', encoding='utf-8') as f:
                plan = json.load(f)

            return self._enrich_plan(plan)

        except Exception as e:
            raise Exception(f"計画書の取得に失敗しました: {str(e)}")

    def save_plan(self, user_id: str, data: dict, file_path: str) -> dict:
        """
        計画書メタデータを保存

        Args:
            user_id: ユーザーID
            data: フォームデータ（projectName等）
            file_path: 生成されたDOCXファイルのパス

        Returns:
            保存した計画書メタデータ
        """
        try:
            user_dir = self.data_dir / user_id
            user_dir.mkdir(parents=True, exist_ok=True)

            plan_id = str(uuid.uuid4())
            filename = Path(file_path).name if file_path else 'unknown.docx'

            # ファイルサイズを取得
            file_size = 0
            if file_path and Path(file_path).exists():
                file_size = Path(file_path).stat().st_size

            now = datetime.now().isoformat()
            plan = {
                'id': plan_id,
                'user_id': user_id,
                'filename': filename,
                'file_path': str(file_path),
                'file_size': file_size,
                'status': 'completed',
                'created_at': now,
                'updated_at': now,
                # フォームデータから主要項目を格納
                'projectName': data.get('projectName', ''),
                'projectType': data.get('projectType', ''),
                'contractNumber': data.get('contractNumber', ''),
                'location': data.get('location', ''),
                'startDate': data.get('startDate', ''),
                'endDate': data.get('endDate', ''),
                'contractAmount': data.get('contractAmount', ''),
                'client': data.get('client', ''),
                'contractor': data.get('contractor', ''),
                # 元のフォームデータも完全保存
                'data': data
            }

            plan_file = user_dir / f'{plan_id}.json'
            with open(plan_file, 'w', encoding='utf-8') as f:
                json.dump(plan, f, ensure_ascii=False, indent=2)

            return plan

        except Exception as e:
            raise Exception(f"計画書の保存に失敗しました: {str(e)}")

    def delete_plan(self, plan_id: str, user_id: str) -> bool:
        """
        計画書を削除（メタデータとDOCXファイル両方）

        Args:
            plan_id: 計画書ID
            user_id: ユーザーID

        Returns:
            成功時True、見つからない場合False
        """
        try:
            plan_file = self.data_dir / user_id / f'{plan_id}.json'
            if not plan_file.exists():
                return False

            # JSONから計画書データを読み込む
            with open(plan_file, 'r', encoding='utf-8') as f:
                plan = json.load(f)

            # JSONメタデータを削除
            plan_file.unlink()

            # DOCXファイルを削除
            docx_path = plan.get('file_path')
            if docx_path and Path(docx_path).exists():
                Path(docx_path).unlink()

            return True

        except Exception as e:
            raise Exception(f"計画書の削除に失敗しました: {str(e)}")

    def update_plan(self, plan_id: str, user_id: str, data: dict) -> Optional[dict]:
        """
        計画書データを更新

        Args:
            plan_id: 計画書ID
            user_id: ユーザーID
            data: 更新データ

        Returns:
            更新後の計画書データ
        """
        plan = self.get_plan(plan_id, user_id)
        if not plan:
            return None

        try:
            # 更新可能フィールド
            updatable = {
                'projectName', 'projectType', 'contractNumber',
                'location', 'startDate', 'endDate',
                'contractAmount', 'client', 'contractor', 'status'
            }

            for key, value in data.items():
                if key in updatable:
                    plan[key] = value
                    if 'data' in plan:
                        plan['data'][key] = value

            plan['updated_at'] = datetime.now().isoformat()

            plan_file = self.data_dir / user_id / f'{plan_id}.json'
            with open(plan_file, 'w', encoding='utf-8') as f:
                json.dump(plan, f, ensure_ascii=False, indent=2)

            return plan

        except Exception as e:
            raise Exception(f"計画書の更新に失敗しました: {str(e)}")

    def _enrich_plan(self, plan: dict) -> dict:
        """
        計画書データにリアルタイム情報を付加

        ファイルサイズ等、JSONに保存されていない動的な情報を追加
        """
        file_path = plan.get('file_path')
        if file_path and Path(file_path).exists():
            plan['file_size'] = Path(file_path).stat().st_size
            plan['file_exists'] = True
        else:
            plan['file_exists'] = False

        return plan
