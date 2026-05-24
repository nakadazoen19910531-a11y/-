"""
ローカル JSON データを Supabase に移行するスクリプト

【使い方】
  1. SUPABASE_URL と SUPABASE_KEY 環境変数を設定する
     例（PowerShell）:
       $env:SUPABASE_URL="https://xxxx.supabase.co"
       $env:SUPABASE_KEY="eyJh..."

  2. backend ディレクトリに移動して実行
       cd backend
       python scripts/migrate_to_supabase.py

【動作】
  - data/users/users.json → users テーブル
  - data/plans/<user_id>/*.json → plans テーブル
  - data/templates/metadata.json + files/*.docx → templates テーブル
  - 既存データはスキップ（id でユニークチェック）
  - 削除済みユーザー（is_active=False）も移行する（履歴保持のため）
"""
import base64
import json
import os
import sys
from pathlib import Path

# このスクリプトは backend ディレクトリから実行する想定
# backend/ を sys.path に追加して db.supabase_client を読み込めるようにする
_BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(_BACKEND_DIR))

# データディレクトリ
_DATA_DIR = _BACKEND_DIR / 'data'
_USERS_JSON = _DATA_DIR / 'users' / 'users.json'
_PLANS_DIR = _DATA_DIR / 'plans'
_TEMPLATES_METADATA = _DATA_DIR / 'templates' / 'metadata.json'
_TEMPLATES_FILES_DIR = _DATA_DIR / 'templates' / 'files'


def main() -> int:
    print('=' * 60)
    print('  Sekoplan データ移行ツール: ローカル JSON → Supabase')
    print('=' * 60)

    # 環境変数チェック
    url = os.getenv('SUPABASE_URL', '').strip()
    key = (os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY') or '').strip()
    if not url or not key:
        print('❌ エラー: SUPABASE_URL と SUPABASE_KEY を環境変数に設定してください')
        print('   PowerShell:')
        print('     $env:SUPABASE_URL="https://xxxx.supabase.co"')
        print('     $env:SUPABASE_KEY="eyJh..."')
        return 1

    # Supabase クライアント取得
    try:
        from db.supabase_client import get_client
        sb = get_client()
        if not sb:
            print('❌ Supabase クライアントの初期化に失敗しました')
            return 1
    except ImportError as e:
        print(f'❌ supabase ライブラリが見つかりません: {e}')
        print('   インストール: pip install supabase')
        return 1

    print(f'✅ Supabase 接続: {url}')
    print()

    total = {'users': 0, 'plans': 0, 'templates': 0}
    skipped = {'users': 0, 'plans': 0, 'templates': 0}
    errors = []

    # ─── ユーザー移行 ─────────────────────────────────────────────────────
    print('━━━ ユーザー移行 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if _USERS_JSON.exists():
        try:
            with open(_USERS_JSON, 'r', encoding='utf-8') as f:
                users = json.load(f)
            for u in users:
                user_id = u.get('id')
                email = u.get('email', '')
                # 既存チェック
                try:
                    res = sb.table('users').select('id').eq('id', user_id).execute()
                    if res.data:
                        print(f'  ⏭️  スキップ（既存）: {email}')
                        skipped['users'] += 1
                        continue
                except Exception as e:
                    print(f'  ⚠️  既存チェック失敗 ({email}): {e}')

                # 挿入用にフィールドを整形
                row = {
                    'id':            u.get('id'),
                    'email':         u.get('email', '').lower(),
                    'name':          u.get('name', ''),
                    'password_hash': u.get('password_hash', ''),
                    'role':          u.get('role', 'user'),
                    'is_active':     u.get('is_active', True),
                    'created_at':    u.get('created_at', ''),
                }
                if u.get('updated_at'):
                    row['updated_at'] = u['updated_at']
                if u.get('deleted_at'):
                    row['deleted_at'] = u['deleted_at']

                try:
                    sb.table('users').insert(row).execute()
                    print(f'  ✅ 移行: {email} ({u.get("role")})')
                    total['users'] += 1
                except Exception as e:
                    print(f'  ❌ 失敗 ({email}): {e}')
                    errors.append(f'user/{email}: {e}')
        except Exception as e:
            print(f'  ❌ users.json 読み込み失敗: {e}')
            errors.append(f'users.json: {e}')
    else:
        print(f'  ℹ️  {_USERS_JSON} が存在しません')
    print()

    # ─── 計画書移行 ─────────────────────────────────────────────────────
    print('━━━ 施工計画書移行 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if _PLANS_DIR.exists():
        for user_dir in _PLANS_DIR.iterdir():
            if not user_dir.is_dir():
                continue
            user_id = user_dir.name
            json_files = list(user_dir.glob('*.json'))
            if not json_files:
                continue
            print(f'  ユーザー {user_id}: {len(json_files)} 件')

            for json_file in json_files:
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        plan = json.load(f)
                    plan_id = plan.get('id', json_file.stem)

                    # 既存チェック
                    try:
                        res = sb.table('plans').select('id').eq('id', plan_id).execute()
                        if res.data:
                            print(f'    ⏭️  スキップ（既存）: {plan.get("projectName", plan_id)}')
                            skipped['plans'] += 1
                            continue
                    except Exception:
                        pass

                    full_data = plan.get('data', {})
                    row = {
                        'id':              plan_id,
                        'user_id':         plan.get('user_id', user_id),
                        'filename':        plan.get('filename', ''),
                        'file_path':       plan.get('file_path', ''),
                        'file_size':       plan.get('file_size', 0),
                        'status':          plan.get('status', 'completed'),
                        'created_at':      plan.get('created_at', ''),
                        'updated_at':      plan.get('updated_at', plan.get('created_at', '')),
                        'project_name':    plan.get('projectName', ''),
                        'project_type':    plan.get('projectType', ''),
                        'contract_number': plan.get('contractNumber', ''),
                        'location':        plan.get('location', ''),
                        'start_date':      plan.get('startDate', ''),
                        'end_date':        plan.get('endDate', ''),
                        'contract_amount': plan.get('contractAmount', ''),
                        'client':          plan.get('client', ''),
                        'contractor':      plan.get('contractor', ''),
                        'full_data':       json.dumps(full_data, ensure_ascii=False),
                    }

                    try:
                        sb.table('plans').insert(row).execute()
                        print(f'    ✅ 移行: {plan.get("projectName", plan_id)}')
                        total['plans'] += 1
                    except Exception as e:
                        print(f'    ❌ 失敗 ({plan_id}): {e}')
                        errors.append(f'plan/{plan_id}: {e}')
                except Exception as e:
                    print(f'    ❌ 読み込み失敗 ({json_file.name}): {e}')
                    errors.append(f'plan/{json_file.name}: {e}')
    else:
        print(f'  ℹ️  {_PLANS_DIR} が存在しません')
    print()

    # ─── テンプレート移行 ─────────────────────────────────────────────────
    print('━━━ テンプレート移行 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if _TEMPLATES_METADATA.exists():
        try:
            with open(_TEMPLATES_METADATA, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            templates = meta.get('templates', [])

            if not templates:
                print('  ℹ️  テンプレートはありません')

            for t in templates:
                t_id = t.get('id')
                t_name = t.get('name', '(無名)')

                # 既存チェック
                try:
                    res = sb.table('templates').select('id').eq('id', t_id).execute()
                    if res.data:
                        print(f'  ⏭️  スキップ（既存）: {t_name}')
                        skipped['templates'] += 1
                        continue
                except Exception:
                    pass

                # ファイル読み込み
                file_path = _TEMPLATES_FILES_DIR / f'{t_id}.docx'
                if not file_path.exists():
                    print(f'  ⚠️  ファイルが見つかりません: {t_name} ({file_path})')
                    errors.append(f'template/{t_name}: file not found')
                    continue

                try:
                    file_bytes = file_path.read_bytes()
                    row = {
                        'id':                t_id,
                        'name':              t_name,
                        'description':       t.get('description', ''),
                        'original_filename': t.get('original_filename', ''),
                        'file_data_b64':     base64.b64encode(file_bytes).decode('ascii'),
                        'file_size':         len(file_bytes),
                        'created_at':        t.get('created_at', ''),
                    }
                    sb.table('templates').insert(row).execute()
                    print(f'  ✅ 移行: {t_name} ({len(file_bytes):,} bytes)')
                    total['templates'] += 1
                except Exception as e:
                    print(f'  ❌ 失敗 ({t_name}): {e}')
                    errors.append(f'template/{t_name}: {e}')
        except Exception as e:
            print(f'  ❌ metadata.json 読み込み失敗: {e}')
            errors.append(f'templates metadata: {e}')
    else:
        print(f'  ℹ️  {_TEMPLATES_METADATA} が存在しません')
    print()

    # ─── サマリー ─────────────────────────────────────────────────────────
    print('=' * 60)
    print('  移行完了サマリー')
    print('=' * 60)
    print(f'  ユーザー:     {total["users"]} 件移行 / {skipped["users"]} 件スキップ')
    print(f'  施工計画書:   {total["plans"]} 件移行 / {skipped["plans"]} 件スキップ')
    print(f'  テンプレート: {total["templates"]} 件移行 / {skipped["templates"]} 件スキップ')
    if errors:
        print()
        print(f'⚠️  エラー: {len(errors)} 件')
        for e in errors:
            print(f'    - {e}')
        return 2
    print()
    print('✅ すべて成功しました')
    return 0


if __name__ == '__main__':
    sys.exit(main())
