import chess_logic 
from pydantic import BaseModel
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

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

@app.post("/move")
def move_piece(data: Move):
    return chess_logic.make_move(data.move)

@app.get("/board")
def board():
    return {"board": chess_logic.get_board()}

@app.get("/game", response_class=HTMLResponse)
def game(request: Request):
    return templates.TemplateResponse("game.html", {"request": request})