from typing import Optional
from fastapi import APIRouter, Form, Request, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import SQLModel, Field, Session, create_engine, select
from pwdlib import PasswordHash

# router stores the routes and will be called in main.py to add the routes to app.
router = APIRouter()
# templates 
templates = Jinja2Templates(directory="templates")
# Create or use file to store account credentials. Create the connection to the database and allow only one thread to synchronize. Then the the hashing object.
DATABASE_URL = "sqlite:///speechchess.db"
"""******************************************************IMPORTANT CONCEPT******************************************************
Engine is the connection to the database and all tables within it. Session(engine) is the active connection to the database. And session
is the object used to get data from the database and update or change the data within the database."""
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
password_hash = PasswordHash.recommended()
"""Defines the database table with id, email, and password fields, SQLModel is passed as the base class. Has a one-to-one correspondence with
the UserSettings database table since class UserSettings references the id field in class User by doing foreign_key="user.id".id being the 
primary key means the value of this field (column) in the database table must be unique for each entry (row) of the database table."""
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str

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
@router.post("/signup")
def signup(request: Request, email: str = Form(...), password: str = Form(...)):
    # If email or password fields empty, return the same page and print the error message to the screen.
    if not email or not password:
        return templates.TemplateResponse("user_authentication/get_started.html", {"request": request, "error": "Email and password are required"})
    # Opens active connection to the database and uses a session object to update data in the database.    
    with Session(engine) as session:
        existing_user = session.exec(select(User).where(User.email == email)).first()
        # Fail if email is used already and return the same page, print the error message to the screen.
        if existing_user:
            return templates.TemplateResponse("user_authentication/get_started.html", {"request": request,"error": "Email already registered"})
        # Create new user and hash the password before adding and committing to the database.
        new_user = User(email=email, hashed_password=password_hash.hash(password))
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
    # Redirect new user to login page after successfully creating their account. 
    return RedirectResponse(url="/user_authentication/login", status_code=303)

# Handle post request to /login. Get form data and open a database session. Fail if no account exists for that email or if the password is incorrect.
@router.post("/login")
def login(request: Request, email: str = Form(...), password: str = Form(...)):
    email = email.strip()
    if not email or not password:
        return templates.TemplateResponse(request=request, name="user_authentication/login.html", context={"request": request, "error": "Please enter both an email and password.", "email": email})
    # Opens active connection to the database and uses a session object to update and fetch data in the database.
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if user is None:
            return templates.TemplateResponse(request=request, name="user_authentication/login.html", context={"request": request, "error": "Invalid email or password.", "email": email})
        if not password_hash.verify(password, user.hashed_password):
            return templates.TemplateResponse(request=request, name="user_authentication/login.html", context={"request": request, "error": "Invalid email or password.", "email": email})
    # Store the user's id in the session so it's saved into a cookie in the browser.
    request.session["user_id"] = user.id
    request.session["user_email"] = user.email
    # Redirect user to homepage after successfully logging in to their account.
    return RedirectResponse(url="/", status_code=303)

# Allows users to logout and clear cookies, they're then redirected to the homepage.
@router.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/", status_code=303)

"""Fetch a user's sidebar settings when a user accesses the settings page. Get's their user ID and email, they're redirected to the login
page if no user ID is found. If a user ID is found, then the call to get or create the database table containing the user settings is made
and the settings page is returned to the user with the user's email and their settings."""
@router.get("/sidebar/settings", response_class=HTMLResponse)
def settings_page(request: Request):
    user_id = request.session.get("user_id")
    user_email = request.session.get("user_email")
    if user_id is None:
        return RedirectResponse(url="/user_authentication/login", status_code=303)
    # Opens active connection to the database and uses a session object to update and fetch data in the database.
    with Session(engine) as session:
        settings = get_or_create_user_settings(session, user_id)
    return templates.TemplateResponse(request=request, name="sidebar/settings.html", context={"request": request, "user_email": user_email, "settings": settings})

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