import chess_logic
import Voice
from pydantic import BaseModel
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from user_authentication import router as authentication_router, create_db_and_tables, engine, get_or_create_user_settings
from contextlib import asynccontextmanager
from starlette.middleware.sessions import SessionMiddleware
from sqlmodel import Session
import uuid
import json

# Create database and tables during startup. App runs after yield.
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

# Creates a fastapi instance, pass lifespan function so it runs when app starts and creates the database and tables during startup.
app = FastAPI(lifespan=lifespan)
# Mounted to the /static path, refers to the "static directory", referred by FastAPI as static. If a there is a request to a file with /static, serve it from the static/ folder directly with FastAPI.
app.mount("/static", StaticFiles(directory="static"), name="static")
# Create an instance, templates, to later render and return a TemplateResponse. All html files are in templates directory.
templates = Jinja2Templates(directory="templates")

# Helper function to return saved user settings from SQLModel object, converted to a dictionary, if user is logged in. Or return standard settings from dictionary if not.
def render_page(request: Request, template_name: str):
    user_email = request.session.get("user_email")
    user_id = request.session.get("user_id")
    settings = None
    if user_id is not None:
        with Session(engine) as session:
            settings_object = get_or_create_user_settings(session, user_id)
            settings = {"narrator_enabled": settings_object.narrator_enabled, "voice_input_enabled": settings_object.voice_input_enabled, "master_volume": settings_object.master_volume, "narrator_volume": settings_object.narrator_volume, "music_volume": settings_object.music_volume, "sound_effects_volume": settings_object.sound_effects_volume}
            return templates.TemplateResponse(request=request, name=template_name, context={"request": request, "user_email": user_email, "settings": settings})
    else:
        settings = {"narrator_enabled": True, "voice_input_enabled": True, "master_volume": 50, "narrator_volume": 50, "music_volume": 50, "sound_effects_volume": 50}
        return templates.TemplateResponse(request=request, name=template_name, context={"request": request, "user_email": user_email, "settings": settings})
        
# Reads session cookie before and after every request and verifies the key. Then grants access to the request.session. request.session is a dictionary that stores the fields, fastapi middleware saves it to a cookie.
app.add_middleware(SessionMiddleware, secret_key="secret-key")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Switch to url of git website when it gets working
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add all routes from authentication_router to app.
app.include_router(authentication_router)

# root() runs whenever "/" path occurs. Route returns HTML. root() passes an instance of the Request object named request. Returns render_page instance.
@app.get("/", response_class = HTMLResponse)
def root(request: Request):
    return render_page(request, "index.html")

# All the user_authentication directory html file returns
@app.get("/user_authentication/get_started", response_class = HTMLResponse)
def get_started_page(request: Request):
    return render_page(request, "user_authentication/get_started.html")

@app.get("/user_authentication/login", response_class = HTMLResponse)
def login_page(request: Request):
    return render_page(request, "user_authentication/login.html")

@app.get("/user_authentication/signup", response_class = HTMLResponse)
def signup_page(request: Request):
    return render_page(request, "user_authentication/signup.html")

@app.get("/user_authentication/profile",  response_class = HTMLResponse)
def profile_page(request: Request):
    return render_page(request, "user_authentication/profile.html")

# All the play directory html file returns
@app.get("/play/play", response_class = HTMLResponse)
def play_page(request: Request):
    return render_page(request, "play/play.html")
    
@app.get("/play/play_online", response_class = HTMLResponse)
def play_online_page(request: Request):
    return render_page(request, "play/play_online.html")

@app.get("/play/play_ai", response_class = HTMLResponse)
def play_ai_page(request: Request):
    return render_page(request, "play/play_ai.html")

@app.get("/play/play_friends", response_class = HTMLResponse)
def play_friends_page(request: Request):
    return render_page(request, "play/play_friends.html")

@app.get("/play/stats", response_class = HTMLResponse)
def stats_page(request: Request):
    return render_page(request, "play/stats.html")

@app.get("/play/history", response_class = HTMLResponse)
def history_page(request: Request):
    return render_page(request, "play/history.html")

# All the puzzle directory html file returns
@app.get("/puzzles/daily_puzzle", response_class = HTMLResponse)
def daily_puzzle_page(request: Request):
    return render_page(request, "puzzles/daily_puzzle.html")

@app.get("/puzzles/all_puzzles", response_class = HTMLResponse)
def all_puzzles_page(request: Request):
    return render_page(request, "puzzles/all_puzzles.html")

# Rest of the sidebar html file returns
@app.get("/sidebar/learn", response_class = HTMLResponse)
def learn_page(request: Request):
    return render_page(request, "sidebar/learn.html")    
    
@app.get("/sidebar/community", response_class = HTMLResponse)
def community_page(request: Request):
    return render_page(request, "sidebar/community.html")

@app.get("/sidebar/settings", response_class = HTMLResponse)
def settings_page(request: Request):
    return render_page(request, "sidebar/settings.html")

@app.get("/sidebar/support", response_class = HTMLResponse)
def support_page(request: Request):
    return render_page(request, "sidebar/support.html")

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
    parse_result = Voice.parse_speech(data.transcript)

    if parse_result["status"] != "exact":
        return {
            "success": False,
            "error": parse_result["prompt"],
            "transcript": parse_result["transcript"],
            "status": parse_result["status"],
            "options": parse_result.get("options", []),
            **chess_logic.get_game_state(),
        }

    result = chess_logic.make_move(parse_result["move"]["uci"])
    result["transcript"] = parse_result["transcript"]
    result["parsed_move"] = parse_result["move"]
    return result


@app.post("/voice-parse")
def voice_parse(data: VoiceInput):
    result = Voice.parse_speech(data.transcript)
    result["turn"] = chess_logic.get_game_state()["turn"]
    return result

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


class RoomVoiceInput(BaseModel):
    room_id: str
    player: str
    transcript: str


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


@app.post("/rooms/voice-parse", summary="Parse a voice move for a room")
def parse_room_voice(req: RoomVoiceInput):
    room = get_room_or_404(req.room_id)

    if room["game_over"]:
        return {
            "status": "invalid",
            "transcript": req.transcript,
            "prompt": "This game is already over.",
            "turn": room["turn"],
        }

    if room["turn"] != req.player:
        return {
            "status": "invalid",
            "transcript": req.transcript,
            "prompt": f"It is {room['turn']}'s turn.",
            "turn": room["turn"],
        }

    result = Voice.parse_speech(req.transcript, room["game"].board)
    result["turn"] = room["turn"]
    return result

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

@app.post("/undo")
def undo_move():
    if len(board.move_stack) > 0:
        board.pop()
    return {"success": True}

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
