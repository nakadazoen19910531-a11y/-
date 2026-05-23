"""WSGI application entry point for production deployment"""
import os
from dotenv import load_dotenv
from app import create_app

# Load environment variables
load_dotenv()

# Create Flask application
app = create_app(config_name=os.getenv('FLASK_ENV', 'production'))

if __name__ == '__main__':
    app.run()
