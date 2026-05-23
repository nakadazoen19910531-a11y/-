"""Construction plan endpoints"""
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
from services.plan_service import PlanService
from services.document_service import DocumentService

plans_bp = Blueprint('plans', __name__)


@plans_bp.route('/', methods=['GET'])
@jwt_required()
def get_plans():
    """
    Get all construction plans for current user

    Returns:
        JSON response with plans list
    """
    user_id = get_jwt_identity()

    try:
        plan_service = PlanService()
        plans = plan_service.get_user_plans(user_id)

        return jsonify({
            'status': 'success',
            'plans': plans
        }), 200

    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch plans',
            'message': str(e)
        }), 500


@plans_bp.route('/<plan_id>', methods=['GET'])
@jwt_required()
def get_plan(plan_id):
    """
    Get specific construction plan

    Returns:
        JSON response with plan data
    """
    user_id = get_jwt_identity()

    try:
        plan_service = PlanService()
        plan = plan_service.get_plan(plan_id, user_id)

        if not plan:
            return jsonify({'error': 'Plan not found'}), 404

        return jsonify({
            'status': 'success',
            'plan': plan
        }), 200

    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch plan',
            'message': str(e)
        }), 500


@plans_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_plan():
    """
    Generate construction plan DOCX document

    Returns:
        JSON response with generated file info
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        # Validate required fields
        required_fields = [
            'projectName', 'projectType', 'contractNumber',
            'location', 'startDate', 'endDate',
            'contractAmount', 'client', 'contractor'
        ]

        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'fields': missing_fields
            }), 400

        # Generate document
        document_service = DocumentService()
        file_path = document_service.generate_docx(data)

        # Save plan record
        plan_service = PlanService()
        plan = plan_service.save_plan(user_id, data, file_path)

        return jsonify({
            'status': 'success',
            'plan_id': plan['id'],
            'filename': plan['filename'],
            'download_url': f'/api/plans/{plan["id"]}/download'
        }), 201

    except Exception as e:
        return jsonify({
            'error': 'Failed to generate plan',
            'message': str(e)
        }), 500


@plans_bp.route('/<plan_id>/download', methods=['GET'])
@jwt_required()
def download_plan(plan_id):
    """
    Download construction plan DOCX file

    Returns:
        DOCX file download
    """
    user_id = get_jwt_identity()

    try:
        plan_service = PlanService()
        plan = plan_service.get_plan(plan_id, user_id)

        if not plan:
            return jsonify({'error': 'Plan not found'}), 404

        file_path = plan['file_path']

        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        return send_file(
            file_path,
            as_attachment=True,
            download_name=plan['filename']
        )

    except Exception as e:
        return jsonify({
            'error': 'Failed to download plan',
            'message': str(e)
        }), 500


@plans_bp.route('/<plan_id>', methods=['DELETE'])
@jwt_required()
def delete_plan(plan_id):
    """
    Delete construction plan

    Returns:
        JSON response confirming deletion
    """
    user_id = get_jwt_identity()

    try:
        plan_service = PlanService()
        success = plan_service.delete_plan(plan_id, user_id)

        if not success:
            return jsonify({'error': 'Plan not found'}), 404

        return jsonify({
            'status': 'success',
            'message': 'Plan deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'error': 'Failed to delete plan',
            'message': str(e)
        }), 500
