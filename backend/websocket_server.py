# server.py

import asyncio
import websockets
import json
from pymongo import MongoClient
import os
import jwt
import datetime
import time
from functools import wraps

# Secret key for JWT (should be the same as in auth.py)
SECRET_KEY = 'your_secret_key'  # Replace with the same secret key used in auth.py

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

# Load Ordinooki data from JSON
ORDINOOKI_JSON_PATH = os.path.join(os.path.dirname(__file__), 'ordinooki.json')  # Adjust the path as needed
try:
    with open(ORDINOOKI_JSON_PATH, 'r') as f:
        ordinooki_data_list = json.load(f)
    # Create a dictionary for quick lookup by ID
    ordinooki_data_dict = {ordinooki['id']: ordinooki for ordinooki in ordinooki_data_list}
    print("Ordinooki data loaded successfully.")
except Exception as e:
    print(f"Failed to load Ordinooki data: {e}")
    exit(1)

# Rate limiting configuration
MIN_UPDATE_INTERVAL_MS = 100  # Minimum update interval in milliseconds (adjust as needed)

# Keep track of connected clients and game state
connected_clients = set()
client_usernames = {}        # websocket -> username mapping
last_update_times = {}       # username -> last update time tracking
username_to_client = {}      # username -> websocket mapping
game_state = {
    "map": "assets/map.png",  # Reference to the map
    "players": {}             # Player data will be stored here
}

async def server(websocket, path):
    # Receive the authentication token from the client
    try:
        auth_message = await asyncio.wait_for(websocket.recv(), timeout=5)
        auth_data = json.loads(auth_message)
        token = auth_data.get('token')

        # Authenticate the user using JWT
        username = authenticate_user(token)
        if not username:
            await websocket.send(json.dumps({'error': 'Authentication failed'}))
            await websocket.close()
            return

        # Send authentication success message
        await websocket.send(json.dumps({'authenticated': True}))

    except asyncio.TimeoutError:
        await websocket.send(json.dumps({'error': 'Authentication timeout'}))
        await websocket.close()
        return
    except Exception as e:
        print(f"Error during authentication: {e}")
        await websocket.send(json.dumps({'error': 'Invalid authentication message'}))
        await websocket.close()
        return

    # Add new connection to the set
    connected_clients.add(websocket)
    client_usernames[websocket] = username
    username_to_client[username] = websocket
    print(f"New client connected: {username}")

    player_id = username

    # Load user progress if it exists
    user = usuarios_collection.find_one({'username': username})
    progress = user.get('progress', {})
    if progress:
        x = progress.get('x', 250)
        y = progress.get('y', 425)
        animation = progress.get('animation', 'stand')
        flipX = progress.get('flipX', False)
        scale = progress.get('scale', 1)
    else:
        x, y, animation, flipX, scale = 250, 425, 'stand', False, 1

    # Initialize new player state in the game state
    game_state["players"][player_id] = {
        "x": x,
        "y": y,
        "animation": animation,
        "flipX": flipX,
        "scale": scale
    }

    # Send the current game state to the newly connected client (excluding its own data)
    await websocket.send(json.dumps({
        "type": "gameState",
        "map": game_state["map"],
        "players": {
            id: {
                **player,
                "username": id
            } for id, player in game_state["players"].items() if id != player_id
        }
    }))

    try:
        async for message in websocket:
            # Parse the message
            data = json.loads(message)

            message_type = data.get("type", "playerUpdate")

            if message_type == "playerUpdate":
                # Check rate limiting
                current_time = time.time() * 1000  # Get current time in milliseconds
                if current_time - last_update_times.get(username, 0) < MIN_UPDATE_INTERVAL_MS:
                    continue  # Ignore this update if too soon

                # Update last update time
                last_update_times[username] = current_time

                # Update the game state with the new player data
                game_state["players"][player_id] = {
                    "x": data.get("x"),
                    "y": data.get("y"),
                    "animation": data.get("animation", "stand"),
                    "flipX": data.get("flipX", False),
                    "scale": data.get("scale", 1)
                }

                # Broadcast the player's update to all other clients
                update_message = {
                    "type": "playerUpdate",
                    "username": player_id,
                    "x": data.get("x"),
                    "y": data.get("y"),
                    "animation": data.get("animation", "stand"),
                    "flipX": data.get("flipX", False),
                    "scale": data.get("scale", 1)
                }
                for client in connected_clients:
                    if client != websocket:
                        await client.send(json.dumps(update_message))

            elif message_type == "challenge_request":
                # Handle challenge request
                target_username = data.get("to")
                from_username = data.get("from")
                if target_username in username_to_client:
                    target_client = username_to_client[target_username]
                    # Forward the challenge request to the target client
                    await target_client.send(json.dumps({
                        "type": "challenge_request",
                        "from": from_username,
                        "to": target_username
                    }))
                    print(f"Challenge request from {from_username} to {target_username} forwarded")
                else:
                    # Target user not connected
                    print(f"Challenge request failed: User {target_username} not connected")
                    # Notify the sender that the target is not available
                    await websocket.send(json.dumps({
                        "type": "challenge_response",
                        "success": False,
                        "message": f"User {target_username} is not connected."
                    }))

            elif message_type == "challenge_accept":
                # Handle challenge acceptance
                target_username = data.get("to")
                from_username = data.get("from")

                # Notify both players that the challenge is accepted
                if target_username in username_to_client and from_username in username_to_client:
                    target_client = username_to_client[target_username]
                    from_client = username_to_client[from_username]

                    # Fetch Ordinooki IDs for both players from the database
                    from_user = usuarios_collection.find_one({'username': from_username})
                    to_user = usuarios_collection.find_one({'username': target_username})

                    from_ordinooki_id = from_user.get('selected_ordinooki')
                    to_ordinooki_id = to_user.get('selected_ordinooki')

                    if not from_ordinooki_id or not to_ordinooki_id:
                        # Handle case where one or both players haven't selected an Ordinooki
                        error_message = {
                            "type": "fight_start_error",
                            "message": "Both players must have selected an Ordinooki to fight."
                        }
                        await from_client.send(json.dumps(error_message))
                        await target_client.send(json.dumps(error_message))
                        print(f"Fight start failed: One or both players haven't selected an Ordinooki.")
                        continue

                    # Fetch Ordinooki details from the loaded JSON
                    from_ordinooki = ordinooki_data_dict.get(from_ordinooki_id)
                    to_ordinooki = ordinooki_data_dict.get(to_ordinooki_id)

                    if not from_ordinooki or not to_ordinooki:
                        # Handle case where Ordinooki data is missing
                        error_message = {
                            "type": "fight_start_error",
                            "message": "Ordinooki data is missing for one or both players."
                        }
                        await from_client.send(json.dumps(error_message))
                        await target_client.send(json.dumps(error_message))
                        print(f"Fight start failed: Ordinooki data missing for players.")
                        continue

                    # Send fight_start message to both players with full Ordinooki data
                    fight_start_message = {
                        "type": "fight_start",
                        "player1": {
                            "username": from_username,
                            "ordinooki": from_ordinooki
                        },
                        "player2": {
                            "username": target_username,
                            "ordinooki": to_ordinooki
                        }
                    }

                    await from_client.send(json.dumps(fight_start_message))
                    await target_client.send(json.dumps(fight_start_message))

                    print(f"Fight started between {from_username} and {target_username}")

                else:
                    # One or both users are not connected
                    print(f"Challenge accept failed: {from_username} or {target_username} not connected.")
                    await websocket.send(json.dumps({
                        "type": "challenge_response",
                        "success": False,
                        "message": f"Challenge accept failed. Ensure both players are connected."
                    }))

            elif message_type == "challenge_decline":
                # Handle challenge decline
                target_username = data.get("to")
                from_username = data.get("from")

                # Notify both players that the challenge is declined
                if target_username in username_to_client and from_username in username_to_client:
                    target_client = username_to_client[target_username]
                    from_client = username_to_client[from_username]

                    await target_client.send(json.dumps({
                        "type": "challenge_decline",
                        "from": from_username,
                        "to": target_username
                    }))
                    await from_client.send(json.dumps({
                        "type": "challenge_decline",
                        "from": from_username,
                        "to": target_username
                    }))
                    print(f"Challenge declined by {from_username} for {target_username}")
                else:
                    # One or both users are not connected
                    print(f"Challenge decline failed: {from_username} or {target_username} not connected.")
                    await websocket.send(json.dumps({
                        "type": "challenge_response",
                        "success": False,
                        "message": f"Challenge decline failed. Ensure both players are connected."
                    }))

            elif message_type == "challenge_cancel":
                # Handle challenge cancellation
                target_username = data.get("to")
                from_username = data.get("from")

                # Notify both players
                clients_to_notify = set()
                if target_username in username_to_client:
                    clients_to_notify.add(username_to_client[target_username])
                if from_username in username_to_client:
                    clients_to_notify.add(username_to_client[from_username])

                cancel_message = {
                    "type": "challenge_cancel",
                    "from": from_username,
                    "to": target_username
                }

                for client in clients_to_notify:
                    await client.send(json.dumps(cancel_message))

                print(f"Challenge between {from_username} and {target_username} cancelled")

            else:
                print(f"Unknown message type received from {username}: {message_type}")

    except websockets.exceptions.ConnectionClosedError:
        print(f"Client {username} disconnected")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Remove disconnected clients
        connected_clients.remove(websocket)
        client_usernames.pop(websocket, None)
        username_to_client.pop(username, None)
        print(f"Client removed: {username}")

        # Save user progress
        player_data = game_state["players"].get(player_id)
        if player_data:
            usuarios_collection.update_one(
                {'username': username},
                {'$set': {'progress': player_data}}
            )

        # Remove the player from the game state
        if player_id in game_state["players"]:
            del game_state["players"][player_id]
            print(f"Removed player {player_id} from game state")

        # Notify all clients about the removed player
        disconnect_message = {
            "type": "playerDisconnect",
            "username": player_id
        }

        for client in connected_clients:
            await client.send(json.dumps(disconnect_message))

def authenticate_user(token):
    try:
        # Decode the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        username = payload.get('username')

        if username:
            user = usuarios_collection.find_one({'username': username})
            if user:
                print(f"Authenticated user: {username}")
                return username
            else:
                print(f"No user found with username: {username}")
                return None
        else:
            print("Token does not contain username")
            return None
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {e}")
        return None
    except Exception as e:
        print(f"Error during token decoding: {e}")
        return None

# Start WebSocket server with higher timeout settings
start_server = websockets.serve(
    server,
    "localhost",
    6789,
    ping_interval=20,  # Ping clients every 20 seconds to keep the connection alive
    ping_timeout=60,   # Wait for 60 seconds before considering a client dead
)

asyncio.get_event_loop().run_until_complete(start_server)
print("WebSocket server started on ws://localhost:6789")
asyncio.get_event_loop().run_forever()
