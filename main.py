import chess_logic
import Voice
from pydantic import BaseModel
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uuid
import json

# Creates a fastapi instance
app = FastAPI()
# Mounted to the /static path, refers to the "static directory", referred by FastAPI as static. If a there is a request to a file with /static, serve it from the static/ folder directly with FastAPI.
app.mount("/static", StaticFiles(directory="static"), name="static")
# Create an instance, templates, to later render and return a TemplateResponse. All html files are in templates directory.
templates = Jinja2Templates(directory="templates")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Switch to url of git website when it gets working
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# root() runs whenever "/" path occurs. Route returns HTML. root() passes an instance of the Request object named request. Returns template instance.
@app.get("/", response_class = HTMLResponse)
def root(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={"request": request})

# All the user_authentication directory html file returns
@app.get("/user_authentication/get_started", response_class = HTMLResponse)
def getStartedPage(request: Request):
    return templates.TemplateResponse(request=request, name="user_authentication/get_started.html", context={"request": request})

@app.get("/user_authentication/login", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="user_authentication/login.html", context={"request": request})

@app.get("/user_authentication/signup", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="user_authentication/signup.html", context={"request": request})

# All the play directory html file returns
@app.get("/play/play", response_class = HTMLResponse)
def playPage(request: Request):
    return templates.TemplateResponse(request=request, name="play/play.html", context={"request": request})
    
@app.get("/play/play_online", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="play/play_online.html", context={"request": request})

@app.get("/play/play_ai", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="play/play_ai.html", context={"request": request})

@app.get("/play/play_friends", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="play/play_friends.html", context={"request": request})

@app.get("/play/stats", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="play/stats.html", context={"request": request})

@app.get("/play/history", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="play/history.html", context={"request": request})

# All the puzzle directory html file returns
@app.get("/puzzles/daily_puzzle", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="puzzles/daily_puzzle.html", context={"request": request})

@app.get("/puzzles/all_puzzles", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="puzzles/all_puzzles.html", context={"request": request})

# Rest of the sidebar html file returns
@app.get("/sidebar/learn", response_class = HTMLResponse)
def learnPage(request: Request):
    return templates.TemplateResponse(request=request, name="sidebar/learn.html", context={"request": request})    
    
@app.get("/sidebar/community", response_class = HTMLResponse)
def community_page(request: Request):
    return templates.TemplateResponse(request=request, name="sidebar/community.html", context={"request": request})

@app.get("/sidebar/settings", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="sidebar/settings.html", context={"request": request})

@app.get("/sidebar/support", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="sidebar/support.html", context={"request": request})

#Chess Logic

class Move(BaseModel):
    move: str

class VoiceInput(BaseModel):
    transcript: str

@app.get("/state")
def state():
    return chess_logic.get_game_state()

@app.get("/game", response_class=HTMLResponse)
def game(request: Request):
    return templates.TemplateResponse(request=request, name="game.html", context={"request": request})

@app.get("/voice", response_class=HTMLResponse)
def voice(request: Request):
    return templates.TemplateResponse(request=request, name="voice.html", context={"request": request})

@app.get("/board")
def board():
    return chess_logic.get_game_state()

@app.post("/move")
def move_piece(data: Move):
    return chess_logic.make_move(data.move)

@app.post("/voice-move")
def voice_move(data: VoiceInput):
    move_text = Voice.speech_to_move(data.transcript)

    if move_text is None:
        return {
            "success": False,
            "error": "Could not understand a legal move from that speech input.",
            "transcript": data.transcript,
            **chess_logic.get_game_state(),
        }

    return chess_logic.make_move(move_text)

@app.post("/reset")
def reset():
    return chess_logic.reset_game()

# Implementation for multiplayer
class CreateRoomRequest(BaseModel):
    player_one: str
    player_two: str


class MoveRequest(BaseModel):
    room_id: str
    player: str
    move: str


class LeaveRequest(BaseModel):
    room_id: str
    player: str


rooms: dict[str, dict] = {} 
connections: dict[str, list] = {} 

def room_data(room: dict) -> dict:
    return {k: v for k, v in room.items() if k != "game"}

def get_room_or_404(room_id: str) -> dict:
    room = rooms.get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_id}' not found")
    return room


@app.post("/rooms", summary="Create a new game room")
def create_room(req: CreateRoomRequest):
    room_id = str(uuid.uuid4())
    rooms[room_id] = {
        "room_id": room_id,
        "player_one": req.player_one,
        "player_two": req.player_two,
        **chess_logic.get_game_state(),
    }
    rooms[room_id]["game"] = chess_logic.GameBoard()
    connections[room_id] = []
    return room_data(rooms[room_id])

@app.get("/rooms", summary="List all rooms")
def list_rooms():
    return list(rooms.values())


@app.get("/rooms/{room_id}", summary="Get room state")
def get_room(room_id: str):
    return get_room_or_404(room_id)


@app.post("/rooms/move", summary="Submit a chess move")
async def submit_move(req: MoveRequest):
    room = get_room_or_404(req.room_id)

    if room["game_over"]:
        raise HTTPException(status_code=400, detail="Game is already over")

    if room["turn"] != req.player:
        raise HTTPException(status_code=400, detail=f"It is {room['turn']}'s turn")

    result = room["game"].make_move(req.move)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])

    rooms[req.room_id].update(result)
    await broadcast(req.room_id, {"event": "move", "data": room_data(rooms[req.room_id])})
    return room_data(rooms[req.room_id])

@app.post("/rooms/reset", summary="Reset the board in a room")
async def reset_room(room_id: str):
    get_room_or_404(room_id)
    result = chess_logic.reset_game()
    rooms[room_id].update(result)
    await broadcast(room_id, {"event": "reset", "data": room_data(rooms[room_id])})
    return room_data(rooms[room_id])

@app.post("/rooms/leave", summary="Player leaves a room")
async def leave_room(req: LeaveRequest):
    room = get_room_or_404(req.room_id)

    if room["game_over"]:
        raise HTTPException(status_code=400, detail="Game is already over")

    room["game_over"] = True
    room["winner"] = (
        room["player_two"] if req.player == room["player_one"] else room["player_one"]
    )
    await broadcast(req.room_id, {"event": "leave", "data": room_data(room)})
    return room_data(room)

@app.delete("/rooms/{room_id}", summary="Delete a room")
def delete_room(room_id: str):
    get_room_or_404(room_id)
    del rooms[room_id]
    connections.pop(room_id, None)
    return {"detail": f"Room '{room_id}' deleted"}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    if room_id not in rooms:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    connections[room_id].append(websocket)
    await websocket.send_text(json.dumps({"event": "state", "data": {k: v for k, v in rooms[room_id].items() if k != "game"}}))

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg.get("type") == "move":
                room = rooms.get(room_id)
                if not room or room.get("game_over"):
                    continue
                if room["turn"] != msg["player"]:
                    await websocket.send_text(json.dumps({"event": "error", "detail": "Not your turn"}))
                    continue
                result = room["game"].make_move(msg["move"])
                if not result["success"]:
                    await websocket.send_text(json.dumps({"event": "error", "detail": result["error"]}))
                    continue
                room.update(result)
                await broadcast(room_id, {"event": "move", "data": room_data(room)})

            elif msg.get("type") == "join":
                if msg.get("player") == "black":
                    rooms[room_id]["player_two"] = msg.get("name", "Player 2")
                    await broadcast(room_id, {"event": "join", "data": room_data(rooms[room_id])})

            elif msg.get("type") == "leave":
                room = rooms.get(room_id)
                if room and not room.get("game_over"):
                    room["game_over"] = True
                    room["winner"] = "black" if msg.get("player") == "white" else "white"
                    await broadcast(room_id, {"event": "leave", "data": room_data(room)})

                
    except WebSocketDisconnect:
        connections[room_id].remove(websocket)


async def broadcast(room_id: str, payload: dict):
    dead = []
    for ws in connections.get(room_id, []):
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(ws)
    for ws in dead:
        connections[room_id].remove(ws)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
