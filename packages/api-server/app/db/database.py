import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.env'))

# Get Firebase credentials from environment variable
firebase_service_account_key_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
firebase_database_url = os.getenv("FIREBASE_DATABASE_URL")

if not firebase_service_account_key_json:
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set.")

if not firebase_database_url:
    raise ValueError("FIREBASE_DATABASE_URL environment variable not set.")

try:
    service_account_info = json.loads(firebase_service_account_key_json)
except json.JSONDecodeError:
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY is not a valid JSON string.")

cred = credentials.Certificate(service_account_info)

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        'databaseURL': firebase_database_url
    })

def get_db():
    return db