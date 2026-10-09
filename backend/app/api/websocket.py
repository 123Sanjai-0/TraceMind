import json
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

ws_manager = ConnectionManager()

@router.websocket("/ws/incidents")
async def websocket_incidents_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial handshake message
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": "Connected to TraceMind real-time incident event stream."
        }))
        while True:
            # Keep connection alive and listen for client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
