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

@app.get("/get_started", response_class = HTMLResponse)
def getStartedPage(request: Request):
    return templates.TemplateResponse("get_started.html", {"request": request})

@app.get("/login", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/signup", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})

# All the play directory html file returns
@app.get("/play/play", response_class = HTMLResponse)
def playPage(request: Request):
    return templates.TemplateResponse("play/play.html", {"request": request})
    
@app.get("/play/play_online", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("play/play_online.html", {"request": request})

@app.get("/play/play_ai", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("play/play_ai.html", {"request": request})

@app.get("/play/play_friends", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("play/play_friends.html", {"request": request})

@app.get("/play/stats", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("play/stats.html", {"request": request})

@app.get("/play/history", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("play/history.html", {"request": request})

# All the puzzle directory html file returns
@app.get("/puzzles/puzzles", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("puzzles/puzzles.html", {"request": request})

@app.get("/puzzles/daily_puzzle", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("puzzles/daily_puzzle.html", {"request": request})

@app.get("/puzzles/all_puzzles", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("puzzles/all_puzzles.html", {"request": request})

# Rest of the sidebar html file returns
@app.get("/sidebar/learn", response_class = HTMLResponse)
def learnPage(request: Request):
    return templates.TemplateResponse("sidebar/learn.html", {"request": request})    
    
@app.get("/sidebar/community", response_class = HTMLResponse)
def community_page(request: Request):
    return templates.TemplateResponse("sidebar/community.html", {"request": request})

@app.get("/sidebar/settings", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("sidebar/settings.html", {"request": request})

@app.get("/sidebar/support", response_class = HTMLResponse)
def settings_page(request: Request):
    return templates.TemplateResponse("sidebar/support.html", {"request": request})



