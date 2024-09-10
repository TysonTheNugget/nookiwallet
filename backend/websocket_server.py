import asyncio
import websockets
import json

# Keep track of connected clients and game state
connected_clients = set()
game_state = {
    "map": "assets/map.png",  # Reference to the map
    "players": {}  # Player data will be stored here
}

async def server(websocket, path):
    # Add new connection to the set
    connected_clients.add(websocket)
    print(f"New client connected: {websocket.remote_address}")

    try:
        # Assign a unique ID to the new player
        player_id = str(websocket.remote_address)

        # Initialize new player state in the game state
        game_state["players"][player_id] = {
            "x": 250,  # Default starting position
            "y": 425,
            "animation": "stand",
            "flipX": False
        }

        # Send the current game state to the newly connected client (excluding its own data)
        await websocket.send(json.dumps({
            "map": game_state["map"],
            "players": {id: player for id, player in game_state["players"].items() if id != player_id}
        }))
        
        # Listen for messages from the client
        async for message in websocket:
            # Parse the message
            data = json.loads(message)
            print(f"Received data from client: {data}")

            # Update the game state with the new player data
            if player_id:
                game_state["players"][player_id] = {
                    "x": data.get("x"),
                    "y": data.get("y"),
                    "animation": data.get("animation", "stand"),  # Default to 'stand' if not provided
                    "flipX": data.get("flipX", False)  # Default to False if not provided
                }
                print(f"Updated game state: {game_state}")

            # Broadcast the updated game state to all clients, excluding the sender
            for client in connected_clients:
                if client != websocket:
                    await client.send(json.dumps({
                        "map": game_state["map"],
                        "players": {id: player for id, player in game_state["players"].items() if id != str(client.remote_address)}
                    }))

    except websockets.exceptions.ConnectionClosedError:
        print("Client disconnected")
    finally:
        # Remove disconnected clients
        connected_clients.remove(websocket)
        print(f"Client removed: {websocket.remote_address}")

        # Remove the player from the game state
        if player_id in game_state["players"]:
            del game_state["players"][player_id]
            print(f"Removed player {player_id} from game state")

        # Notify all clients about the removed player
        for client in connected_clients:
            await client.send(json.dumps({
                "map": game_state["map"],
                "players": {id: player for id, player in game_state["players"].items()}
            }))

# Start WebSocket server with higher timeout settings
start_server = websockets.serve(
    server,
    "localhost",
    6789,
    ping_interval=20,  # Ping clients every 20 seconds to keep the connection alive
    ping_timeout=60,   # Wait for 60 seconds before considering a client dead
)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
