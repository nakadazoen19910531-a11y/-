"""Development configuration"""
from config.base import Config

class DevConfig(Config):
    """Development configuration"""

    DEBUG = True
    TESTING = False

    # Database
    SQLALCHEMY_DATABASE_URI = 'sqlite:///dev.db'
    SQLALCHEMY_ECHO = True
