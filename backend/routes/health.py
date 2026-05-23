"""Health check endpoint"""
from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__)


@health_bp.route('/', methods=['GET'])
def health_check():
    """
    Health check endpoint

    Returns:
        JSON response with status
    """
    return jsonify({
        'status': 'healthy',
        'service': '施工計画書自動作成システム API',
        'version': '1.0.0'
    }), 200
