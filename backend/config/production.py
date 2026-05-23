"""Production configuration (Render / クラウド環境)"""
import os
from config.base import Config


class ProdConfig(Config):
    """本番環境設定"""

    DEBUG   = False
    TESTING = False

    # CORS: 環境変数 CORS_ORIGINS で指定（カンマ区切り）
    # 例: https://sekoplan.vercel.app,https://my-custom-domain.com
    CORS_ORIGINS = os.getenv(
        'CORS_ORIGINS',
        'https://sekoplan.vercel.app'
    ).split(',')

    # セキュリティ
    SESSION_COOKIE_SECURE   = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
