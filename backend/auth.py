# auth.py

from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
import os
from flask_cors import CORS
import jwt
import datetime
from functools import wraps

app = Flask(__name__)

# Configure CORS to allow requests from http://localhost:3000
CORS(app, origins="http://localhost:3000", supports_credentials=True)

# Secret key for JWT
SECRET_KEY = 'your_secret_key'  # Replace with a strong secret key and keep it secure

# MongoDB connection
MONGODB_CONNECTION_STRING = os.environ.get('MONGODB_CONNECTION_STRING')
if not MONGODB_CONNECTION_STRING:
    print("Please set the MONGODB_CONNECTION_STRING environment variable.")
    exit(1)

try:
    client = MongoClient(MONGODB_CONNECTION_STRING)
    db = client['your_database_name']  # Replace with your actual database name
    usuarios_collection = db['usuarios']  # Collection name
    print("Connected to MongoDB.")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    exit(1)

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
