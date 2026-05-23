"""Testing configuration"""
from config.base import Config

class TestConfig(Config):
    """Testing configuration"""

    DEBUG = True
    TESTING = True

    # Database
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_ECHO = False

    # Disable CSRF for testing
    WTF_CSRF_ENABLED = False
