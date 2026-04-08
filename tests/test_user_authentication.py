import importlib
import os
import sys
import types
from pathlib import Path

import pytest
from sqlmodel import Session, create_engine as real_create_engine, select
from starlette.requests import Request


ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

pytestmark = pytest.mark.filterwarnings(
    "ignore:This declarative base already contains a class with the same class name and module name as user_authentication.User"
)


def build_pwdlib_module():
    module = types.ModuleType("pwdlib")

    class FakeHasher:
        def hash(self, password):
            return f"hashed::{password}"

        def verify(self, password, hashed_password):
            return hashed_password == f"hashed::{password}"

    class PasswordHash:
        @staticmethod
        def recommended():
            return FakeHasher()

    module.PasswordHash = PasswordHash
    return module


def build_request():
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [],
            "session": {},
        }
    )


@pytest.fixture
def user_auth_module(monkeypatch, tmp_path):
    import fastapi.dependencies.utils as dep_utils
    import sqlmodel

    monkeypatch.setattr(dep_utils, "ensure_multipart_is_installed", lambda: None)
    monkeypatch.setitem(sys.modules, "pwdlib", build_pwdlib_module())
    sqlmodel.SQLModel.metadata.clear()
    db_path = tmp_path / "speechchess.db"
    monkeypatch.setattr(
        sqlmodel,
        "create_engine",
        lambda *args, **kwargs: real_create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
        ),
    )

    sys.modules.pop("user_authentication", None)
    module = importlib.import_module("user_authentication")
    module.SQLModel.metadata.create_all(module.engine)
    return module


def test_signup_and_login_store_the_user_session(user_auth_module):
    signup_request = build_request()
    signup_response = user_auth_module.signup(signup_request, "player@example.com", "secret")

    assert signup_response.status_code == 303

    with Session(user_auth_module.engine) as session:
        user = session.exec(
            select(user_auth_module.User).where(
                user_auth_module.User.email == "player@example.com"
            )
        ).first()

    assert user is not None

    login_request = build_request()
    login_response = user_auth_module.login(login_request, "player@example.com", "secret")

    assert login_response.status_code == 303
    assert login_request.session["user_email"] == "player@example.com"


def test_get_rating_and_update_ratings_change_both_players(user_auth_module):
    with Session(user_auth_module.engine) as session:
        winner = user_auth_module.User(
            email="winner@example.com",
            hashed_password=user_auth_module.password_hash.hash("pw1"),
            rating=1200,
        )
        loser = user_auth_module.User(
            email="loser@example.com",
            hashed_password=user_auth_module.password_hash.hash("pw2"),
            rating=1200,
        )
        session.add(winner)
        session.add(loser)
        session.commit()

    before = user_auth_module.get_rating("winner@example.com")
    updated = user_auth_module.update_ratings(
        user_auth_module.UpdateRatingsRequest(
            winner_email="winner@example.com",
            loser_email="loser@example.com",
        )
    )

    assert before["rating"] == 1200
    assert updated["winner_new_rating"] > 1200
    assert updated["loser_new_rating"] < 1200


def test_calculate_elo_guest_login_and_logout(user_auth_module):
    new_winner, new_loser = user_auth_module.calculate_elo(1400, 1200)
    guest_request = build_request()
    guest_response = user_auth_module.guest_login(guest_request)

    logout_request = build_request()
    logout_request.session["user_email"] = "player@example.com"
    logout_response = user_auth_module.logout(logout_request)

    assert new_winner > 1400
    assert new_loser < 1200
    assert guest_response.status_code == 303
    assert guest_request.session["is_guest"] is True
    assert logout_response.status_code == 303
    assert logout_request.session == {}
