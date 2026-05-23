"""
Flask application factory and configuration
施工計画書自動作成システム - バックエンドAPI
"""

import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app(config_name: str = None) -> Flask:
    """
    Application factory function

    Args:
        config_name: Configuration environment (development, production, testing)

    Returns:
        Flask application instance
    """
    app = Flask(__name__)

    # Configuration
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    if config_name == 'production':
        from config.production import ProdConfig
        app.config.from_object(ProdConfig)
    elif config_name == 'testing':
        from config.testing import TestConfig
        app.config.from_object(TestConfig)
    else:
        from config.development import DevConfig
        app.config.from_object(DevConfig)

    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # JWT Configuration
    jwt = JWTManager(app)

    @jwt.additional_claims_loader
    def add_claims_to_jwt(identity):
        """Add additional claims to JWT"""
        return {"user_id": identity}

    # Register blueprints
    register_blueprints(app)

    # Register error handlers
    register_error_handlers(app)

    return app


def register_blueprints(app: Flask) -> None:
    """
    Register all API blueprints

    Args:
        app: Flask application instance
    """
    from routes.auth import auth_bp
    from routes.plans import plans_bp
    from routes.pdf import pdf_bp
    from routes.health import health_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(plans_bp, url_prefix='/api/plans')
    app.register_blueprint(pdf_bp, url_prefix='/api/pdf')
    app.register_blueprint(health_bp, url_prefix='/api/health')


def register_error_handlers(app: Flask) -> None:
    """
    Register error handlers

    Args:
        app: Flask application instance
    """
    from flask import jsonify

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': str(error)
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication required'
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'error': 'Forbidden',
            'message': 'Access denied'
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'Resource not found'
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500


if __name__ == '__main__':
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('FLASK_PORT', 5000)),
        debug=os.getenv('FLASK_DEBUG', False)
    )
