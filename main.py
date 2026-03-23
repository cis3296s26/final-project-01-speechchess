import chess_logic
from pydantic import BaseModel
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from Voice import speech_to_move

# Creates a fastapi instance
app = FastAPI()
# Mounted to the /static path, refers to the "static directory", referred by FastAPI as static. If a there is a request to a file with /static, serve it from the static/ folder directly with FastAPI.
app.mount("/static", StaticFiles(directory="static"), name="static")
# Create an instance, templates, to later render and return a TemplateResponse. All html files are in templates directory.
templates = Jinja2Templates(directory="templates")

# root() runs whenever "/" path occurs. Route returns HTML. root() passes an instance of the Request object named request. Returns template instance.
@app.get("/", response_class = HTMLResponse)
def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

class Move(BaseModel):
    move: str

@app.get("/state")
def state():
    return chess_logic.get_game_state()

@app.get("/game", response_class=HTMLResponse)
def game(request: Request):
    return templates.TemplateResponse("game.html", {"request": request})

@app.post("/move")
def move_piece(data: Move):
    parsed = speech_to_move(data.move)

    if parsed:
        return chess_logic.make_move(parsed)

    return {
        "success": False,
        "error": "Could not understand move",
        **chess_logic.get_game_state(),
    }

@app.post("/reset")
def reset():
    return chess_logic.reset_game()