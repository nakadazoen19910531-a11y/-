@echo off
chcp 65001 > nul
echo ========================================
echo   施工計画書自動作成システム 起動
echo ========================================
echo.

REM バックエンド起動
echo [1/2] Flask バックエンドを起動します...
start "Flask Backend" cmd /k "cd /d %~dp0backend && python app.py"
timeout /t 3 /nobreak > nul

REM フロントエンド起動（Box同期の干渉を避けるためローカルパスから実行）
echo [2/2] Next.js フロントエンドを起動します...
start "Next.js Frontend" cmd /k "cd /d C:\sekoplan-local\frontend && npm run dev"

echo.
echo ========================================
echo   起動完了
echo   フロントエンド: http://localhost:3000
echo   バックエンド API: http://localhost:5000
echo   ログイン: demo@example.com / password123
echo ========================================
echo.
pause
