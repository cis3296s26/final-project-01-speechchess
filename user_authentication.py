from typing import Optional
from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import SQLModel, Field, Session, create_engine, select
from pwdlib import PasswordHash
from pydantic import BaseModel

# router stores the routes and will be called in main.py to add the routes to app.
router = APIRouter()
# templates 
templates = Jinja2Templates(directory="templates")
# Create or use file to store account credentials. Create the connection to the database and allow only one thread to synchronize. Then the the hashing object.
DATABASE_URL = "sqlite:///speechchess.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
password_hash = PasswordHash.recommended()
# Defines the database table with id, email, and password fields.
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    rating: int = Field(default=1200)

# Creates the table in the database, this is called during app startup.
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Handle post request to /signup. Get form data and open a database session. Fail if email is used already, otherwise create a new user. 
@router.post("/signup")
def signup(request: Request, email: str = Form(...), password: str = Form(...)):
    # If email or password fields empty, return the same page and print the error message to the screen.
    if not email or not password:
        return templates.TemplateResponse("user_authentication/get_started.html", {"request": request, "error": "Email and password are required"})
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
