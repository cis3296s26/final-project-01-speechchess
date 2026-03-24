import chess_logic
import Voice
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
    return templates.TemplateResponse(request=request, name="index.html", context={"request": request})

@app.get("/get_started", response_class = HTMLResponse)
def getStartedPage(request: Request):
    return templates.TemplateResponse(request=request, name="get_started.html", context={"request": request})

@app.get("/login", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html", context={"request": request})

@app.get("/signup", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="signup.html", context={"request": request})

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
@app.get("/puzzles/puzzles", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse(request=request, name="puzzles/puzzles.html", context={"request": request})

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
