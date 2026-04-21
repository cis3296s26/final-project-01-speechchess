import os
from typing import Optional
from fastapi import APIRouter, Form, Request, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import SQLModel, Field, Session, create_engine, select
from pwdlib import PasswordHash
from pydantic import BaseModel

# router stores the routes and will be called in main.py to add the routes to app.
router = APIRouter()
# templates
templates = Jinja2Templates(directory="templates")
# Read DATABASE_URL from environment so a Postgres database can be used on Render,
# preventing user accounts from being wiped on every redeploy. Falls back to local
# SQLite when DATABASE_URL is not set (local development). Render provides postgres://
# URLs but SQLAlchemy requires postgresql://, so we fix the scheme if needed.
_raw_db_url = os.getenv("DATABASE_URL", "sqlite:///speechchess.db")
DATABASE_URL = _raw_db_url.replace("postgres://", "postgresql://", 1)
"""******************************************************IMPORTANT CONCEPT******************************************************
Engine is the connection to the database and all tables within it. Session(engine) is the active connection to the database. And session
is the object used to get data from the database and update or change the data within the database."""
# SQLite requires check_same_thread=False; Postgres does not accept that argument.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
password_hash = PasswordHash.recommended()
"""Defines the database table with id, email, and password fields, SQLModel is passed as the base class. Has a one-to-one correspondence with
the UserSettings database table since class UserSettings references the id field in class User by doing foreign_key="user.id".id being the 
primary key means the value of this field (column) in the database table must be unique for each entry (row) of the database table."""
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    rating: int = Field(default=1200)

"""Defines the database table with fields for the settings of each user, SQLModel is passed as the base class. Has a one-to-one correspondence 
with the User database table since user_id references the id field in User as a foreign key, meaning that there must be a user_id value
that matches a value in the id column of User. And of course, user_id is also a primary key of UserSettings so this field (column) in the
database table must be unique for each entry (row) of the database table."""
class UserSettings(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    narrator_enabled: bool = True
    voice_input_enabled: bool = True
    master_volume: int = 50
    narrator_volume: int = 50
    music_volume: int = 50
    sound_effects_volume: int = 50

DEFAULT_SETTINGS = {"narrator_enabled": True, "voice_input_enabled": True, "master_volume": 50, "narrator_volume": 50, "music_volume": 50, "sound_effects_volume": 50}

""" Looks at ALL models that inherit from SQLModel and have table=True (true=True indicates it's a real database table and not just a model). 
# So, it creates the tables in the database, this is called during app startup."""
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Get users' setting or create them and add them to the database with default settings if they don't already exist for a user.
def get_or_create_user_settings(session: Session, user_id: int):
    settings = session.get(UserSettings, user_id)
    if settings is None:
        settings = UserSettings(user_id=user_id)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

# Handle post request to /signup. Get form data and open a database session. Fail if email is used already, otherwise create a new user. 
@router.post("/user_authentication/signup")
def signup(request: Request, email: str = Form(...), password: str = Form(...)):
    # If email or password fields empty, return the same page and print the error message to the screen.
    if not email or not password:
        return templates.TemplateResponse("user_authentication/get_started.html", {"request": request, "error": "Email and password are required", "settings": DEFAULT_SETTINGS})
    # Opens active connection to the database and uses a session object to update data in the database.    
    with Session(engine) as session:
        existing_user = session.exec(select(User).where(User.email == email)).first()
        # Fail if email is used already and return the same page, print the error message to the screen.
        if existing_user:
            return templates.TemplateResponse("user_authentication/get_started.html", {"request": request,"error": "Email already registered", "settings": DEFAULT_SETTINGS})
        # Create new user and hash the password before adding and committing to the database.
        new_user = User(email=email, hashed_password=password_hash.hash(password))
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
    # Redirect new user to login page after successfully creating their account. 
    return RedirectResponse(url="/user_authentication/login?created=1", status_code=303)

# Handle post request to /login. Get form data and open a database session. Fail if no account exists for that email or if the password is incorrect.
@router.post("/user_authentication/login")
def login(request: Request, email: str = Form(...), password: str = Form(...)):
    email = email.strip()
    if not email or not password:
        return templates.TemplateResponse(request=request, name="user_authentication/login.html", context={"request": request, "error": "Please enter both an email and password.", "email": email, "settings": DEFAULT_SETTINGS})
    # Opens active connection to the database and uses a session object to update and fetch data in the database.
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if user is None:
            return templates.TemplateResponse(request=request, name="user_authentication/login.html", context={"request": request, "error": "Invalid email or password.", "email": email, "settings": DEFAULT_SETTINGS})
        if not password_hash.verify(password, user.hashed_password):
            return templates.TemplateResponse(request=request, name="user_authentication/login.html", context={"request": request, "error": "Invalid email or password.", "email": email, "settings": DEFAULT_SETTINGS})
    # Store the user's id in the session so it's saved into a cookie in the browser.
    request.session["user_id"] = user.id
    request.session["user_email"] = user.email
    # Redirect user to homepage after successfully logging in to their account.
    return RedirectResponse(url="/", status_code=303)

# Allows users to logout and clear cookies, they're then redirected to the homepage.
# NEED TO CHANGE REDIRECTION. I SHOULD ADD A DIFFERENT HOMEPAGE WITH DIFFERENT SIDEBAR ONCE A USER HAS LOGGED IN.
def calculate_elo(winner_rating: int, loser_rating: int, k: int = 32):
    expected_winner = 1 / (1 + 10 ** ((loser_rating - winner_rating) / 400))
    expected_loser = 1 - expected_winner
    new_winner = round(winner_rating + k * (1 - expected_winner))
    new_loser = round(loser_rating + k * (0 - expected_loser))
    return new_winner, new_loser

class UpdateRatingsRequest(BaseModel):
    winner_email: str
    loser_email: str

@router.get("/ratings/{email:path}")
def get_rating(email: str):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})
        return {"email": user.email, "rating": user.rating}

@router.post("/update-ratings")
def update_ratings(req: UpdateRatingsRequest):
    with Session(engine) as session:
        winner = session.exec(select(User).where(User.email == req.winner_email)).first()
        loser = session.exec(select(User).where(User.email == req.loser_email)).first()

        if not winner or not loser:
            return JSONResponse(status_code=404, content={"error": "One or both users not found"})

        new_winner_rating, new_loser_rating = calculate_elo(winner.rating, loser.rating)
        winner.rating = new_winner_rating
        loser.rating = new_loser_rating
        session.add(winner)
        session.add(loser)
        session.commit()

    return {"winner_email": req.winner_email, "winner_new_rating": new_winner_rating,
            "loser_email": req.loser_email, "loser_new_rating": new_loser_rating}


@router.get("/guest")
def guest_login(request: Request):
    request.session["user_id"] = None
    request.session["user_email"] = None
    request.session["is_guest"] = True
    return RedirectResponse(url="/", status_code=303)


@router.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/", status_code=303)

"""Handle a post request to update any of the users' settings. Does not return an html template though. If a user ID is found, meaning
they're logged in, the setting they wish to change can be changed if it's a valid setting and change. If valid, then make the change and
submit it to the database for that user ID. This only updates the user settings database so that everytime a change is made the page does 
not have refresh."""
@router.post("/sidebar/settings/update")
def update_setting(request: Request, setting_name: str = Form(...), setting_value: str = Form(...)):
    user_id = request.session.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="User not logged in.")
    allowed_settings = {"narrator_enabled", "voice_input_enabled", "master_volume", "narrator_volume", "music_volume", "sound_effects_volume"}
    if setting_name not in allowed_settings:
        raise HTTPException(status_code=400, detail="Invalid setting name.")
    # Opens active connection to the database and uses a session object to update and fetch data in the database.
    with Session(engine) as session:
        settings = get_or_create_user_settings(session, user_id)
        if setting_name in {"narrator_enabled", "voice_input_enabled"}:
            if setting_value not in {"true", "false"}:
                raise HTTPException(status_code=400, detail="Invalid toggle value.")
            setattr(settings, setting_name, setting_value == "true")
        else:
            try:
                volume = int(setting_value)
            except ValueError:
                raise HTTPException(status_code=400, detail="Volume must be an integer.")
            if volume < 0 or volume > 100:
                raise HTTPException(status_code=400, detail="Volume must be between 0 and 100.")
            setattr(settings, setting_name, volume)
        session.add(settings)
        session.commit()
    # Return success from backend so frontend knows the request worked.
    return {"success": True}

@router.get("/user_authentication/profile", response_class=HTMLResponse)
def profile_page(request: Request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse(url="/user_authentication/login", status_code=303)
    with Session(engine) as session:
        user = session.get(User, user_id)
        if user is None:
            request.session.clear()
            return RedirectResponse(url="/user_authentication/login", status_code=303)
        settings_object = get_or_create_user_settings(session, user_id)
        settings = {"narrator_enabled": settings_object.narrator_enabled, "voice_input_enabled": settings_object.voice_input_enabled, "master_volume": settings_object.master_volume, "narrator_volume": settings_object.narrator_volume, "music_volume": settings_object.music_volume, "sound_effects_volume": settings_object.sound_effects_volume}
        return templates.TemplateResponse("user_authentication/profile.html", {"request": request, "user": user, "user_email": user.email, "settings": settings})