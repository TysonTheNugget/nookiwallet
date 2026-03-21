# auth.py

from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
import os
from flask_cors import CORS
import jwt
import datetime
from functools import wraps
import json
import random

app = Flask(__name__)

# Configure CORS for local frontend dev ports
CORS(
    app,
    origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3010", "http://127.0.0.1:3010"],
    supports_credentials=True
)

# Secret key for JWT
SECRET_KEY = 'your_secret_key'  # Replace with a strong secret key and keep it secure

class LocalUsersCollection:
    def __init__(self, file_path):
        self.file_path = file_path
        self._ensure_file()

    def _ensure_file(self):
        folder = os.path.dirname(self.file_path)
        if folder and not os.path.exists(folder):
            os.makedirs(folder, exist_ok=True)
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump([], f)

    def _read(self):
        self._ensure_file()
        with open(self.file_path, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except Exception:
                return []

    def _write(self, users):
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=2)

    def find_one(self, query):
        users = self._read()
        username = query.get('username')
        if isinstance(username, dict):
            ne_value = username.get('$ne')
            for user in users:
                if user.get('username') != ne_value:
                    return user
            return None

        for user in users:
            if user.get('username') == username:
                return user
        return None

    def insert_one(self, user_data):
        users = self._read()
        users.append(user_data)
        self._write(users)

    def update_one(self, query, operations):
        users = self._read()
        target_username = query.get('username')
        updated = False

        for user in users:
            if user.get('username') != target_username:
                continue

            add_to_set = operations.get('$addToSet', {})
            for key, value in add_to_set.items():
                if isinstance(value, dict) and '$each' in value:
                    user.setdefault(key, [])
                    for item in value['$each']:
                        if item not in user[key]:
                            user[key].append(item)

            set_values = operations.get('$set', {})
            for key, value in set_values.items():
                user[key] = value

            updated = True
            break

        if updated:
            self._write(users)

    def update_many(self, query, operations):
        users = self._read()
        username_clause = query.get('username', {})
        exclude_username = username_clause.get('$ne')

        pull_ops = operations.get('$pull', {})
        changed = False

        for user in users:
            if exclude_username is not None and user.get('username') == exclude_username:
                continue

            for key, value in pull_ops.items():
                if isinstance(user.get(key), list):
                    original_len = len(user[key])
                    user[key] = [x for x in user[key] if x != value]
                    if len(user[key]) != original_len:
                        changed = True

        if changed:
            self._write(users)

# MongoDB connection (fallbacks to local JSON when env var is missing)
MONGODB_CONNECTION_STRING = os.environ.get('MONGODB_CONNECTION_STRING')

if MONGODB_CONNECTION_STRING:
    try:
        client = MongoClient(MONGODB_CONNECTION_STRING)
        db = client['your_database_name']  # Replace with your actual database name
        usuarios_collection = db['usuarios']  # Collection name
        print("Connected to MongoDB.")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        local_users_file = os.path.join(os.path.dirname(__file__), 'data', 'users.local.json')
        usuarios_collection = LocalUsersCollection(local_users_file)
        print(f"Using local auth storage: {local_users_file}")
else:
    local_users_file = os.path.join(os.path.dirname(__file__), 'data', 'users.local.json')
    usuarios_collection = LocalUsersCollection(local_users_file)
    print(f"MONGODB_CONNECTION_STRING not set. Using local auth storage: {local_users_file}")

# Ordinooki dataset for local test assignment
ORDINOOKI_JSON_PATH = os.path.join(os.path.dirname(__file__), 'ordinooki.json')
try:
    with open(ORDINOOKI_JSON_PATH, 'r', encoding='utf-8') as f:
        _ordinooki_data = json.load(f)
    AVAILABLE_ORDINOOKI_IDS = [item.get('id') for item in _ordinooki_data if item.get('id')]
except Exception:
    AVAILABLE_ORDINOOKI_IDS = []

TEST_USERNAME = 'danielsnowi'

def ensure_test_user_has_ordinooki(user):
    """
    For local testing: always ensure `danielsnowi` has at least one Ordinooki and a selected one.
    """
    if not user or user.get('username', '').lower() != TEST_USERNAME:
        return user
    if not AVAILABLE_ORDINOOKI_IDS:
        return user

    ordinooki_ids = user.get('ordinookiIds', []) or []
    selected = user.get('selected_ordinooki')

    changed = False
    if len(ordinooki_ids) == 0:
        picked = random.choice(AVAILABLE_ORDINOOKI_IDS)
        ordinooki_ids = [picked]
        user['ordinookiIds'] = ordinooki_ids
        changed = True
    if (not selected) or (selected not in ordinooki_ids):
        user['selected_ordinooki'] = ordinooki_ids[0]
        changed = True

    if changed:
        usuarios_collection.update_one(
            {'username': user['username']},
            {
                '$addToSet': {'ordinookiIds': {'$each': ordinooki_ids}},
                '$set': {'selected_ordinooki': user['selected_ordinooki']}
            }
        )

    return user

# Authentication middleware
def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow preflight OPTIONS requests to pass without authentication
        if request.method == 'OPTIONS':
            return jsonify({'message': 'OK'}), 200

        token = None
        # JWT is passed in the request header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        
        try:
            # Decode the token
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user = usuarios_collection.find_one({'username': data['username']})
            if not current_user:
                return jsonify({'error': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token!'}), 401
        
        # Pass user information to the route
        return f(current_user, *args, **kwargs)
    
    return decorated

# Registration endpoint
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    # Check if the username already exists
    if usuarios_collection.find_one({'username': username}):
        return jsonify({'error': 'Username already exists'}), 400

    # Hash the password
    password_hash = generate_password_hash(password)

    # Insert the new user into the database
    usuarios_collection.insert_one({
        'username': username,
        'password_hash': password_hash,
        'progress': {},  # Initialize empty progress
        'ordinookiIds': []  # Initialize empty ordinookiIds
    })

    # Local test helper: ensure danielsnowi always has one Ordinooki.
    if username.lower() == TEST_USERNAME:
        created_user = usuarios_collection.find_one({'username': username})
        ensure_test_user_has_ordinooki(created_user)

    return jsonify({'message': 'User registered successfully'}), 201

# Login endpoint
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    user = usuarios_collection.find_one({'username': username})

    if user and check_password_hash(user['password_hash'], password):
        user = ensure_test_user_has_ordinooki(user)
        # Generate a JWT token
        token = jwt.encode({
            'username': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)  # Token expires in 1 hour
        }, SECRET_KEY, algorithm='HS256')

        return jsonify({'message': 'Login successful', 'token': token}), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

# Update Ordinookis endpoint
@app.route('/api/auth/update-ordinookis', methods=['POST'])
@auth_required
def update_ordinookis(current_user):
    data = request.get_json()
    ordinookiIds = data.get('ordinookiIds', [])
    selectedId = data.get('selectedId')  # New field

    if not isinstance(ordinookiIds, list):
        return jsonify({'error': 'ordinookiIds must be a list'}), 400

    if selectedId and selectedId not in ordinookiIds:
        return jsonify({'error': 'selectedId must be one of the ordinookiIds'}), 400

    username = current_user['username']

    try:
        update_fields = {'ordinookiIds': {'$addToSet': {'$each': ordinookiIds}}}
        if selectedId:
            update_fields['selected_ordinooki'] = selectedId

        usuarios_collection.update_one(
            {'username': username},
            {
                '$addToSet': {'ordinookiIds': {'$each': ordinookiIds}},
                '$set': {'selected_ordinooki': selectedId} if selectedId else {}
            }
        )

        # Optionally, remove selectedId from other users to ensure uniqueness
        if selectedId:
            usuarios_collection.update_many(
                {'username': {'$ne': username}},
                {'$pull': {'ordinookiIds': selectedId}}
            )

        return jsonify({'message': 'Ordinookis updated successfully'}), 200

    except Exception as e:
        print(f"Error updating Ordinookis: {e}")
        return jsonify({'error': 'Failed to update Ordinookis'}), 500


# Fetch Ordinookis endpoint
@app.route('/api/ordinookis', methods=['GET'])
@auth_required
def get_ordinookis(current_user):
    current_user = ensure_test_user_has_ordinooki(current_user)
    ordinookiIds = current_user.get('ordinookiIds', [])
    
    if not ordinookiIds:
        return jsonify({'ordinookis': []}), 200

    # Fetch Ordinooki details based on IDs
    # Assuming you have a collection or data source for Ordinookis
    # For this example, we'll mock the data
    # Replace this with actual database queries as needed
    ordinookis = []
    for oid in ordinookiIds:
        # Mock Ordinooki data
        # Replace with actual data fetching logic
        ordinooki = {
            'id': oid,
            'meta': {
                'name': f'Ordinooki {oid}',
                'stats': {
                    'HP': 100,
                    'Attack': 20,
                    'Defense': 15,
                    'Speed': 10,
                    'Critical Chance': 5
                }
            }
        }
        ordinookis.append(ordinooki)
    
    return jsonify({'ordinookis': ordinookis}), 200

if __name__ == '__main__':
    app.run(port=5000)
