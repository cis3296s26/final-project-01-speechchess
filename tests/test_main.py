import asyncio
import importlib
import os
import sys
import types
from pathlib import Path

import pytest
from sqlmodel import Session, create_engine as real_create_engine
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


def build_request(session_data=None):
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [],
            "session": dict(session_data or {}),
        }
    )


class DummyUploadFile:
    def __init__(self, payload, filename="speech.webm"):
        self.payload = payload
        self.filename = filename

    async def read(self):
        return self.payload


@pytest.fixture
def main_module(monkeypatch, tmp_path):
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
    sys.modules.pop("main", None)
    module = importlib.import_module("main")
    module.rooms.clear()
    module.connections.clear()
    module.chess_logic.reset_game()
    return module


def test_state_move_and_voice_endpoints_work(main_module):
    state = main_module.state()
    move_result = main_module.move_piece(main_module.Move(move="e2e4"))
    voice_result = main_module.voice_move(main_module.VoiceInput(transcript="e7 to e5"))
    parsed = main_module.voice_parse(main_module.VoiceInput(transcript="knight f3"))

    assert state["turn"] == "white"
    assert move_result["success"] is True
    assert voice_result["success"] is True
    assert parsed["status"] == "exact"
    assert parsed["turn"] == "white"


def test_ctx_reads_logged_in_user_and_undo_restores_board(main_module):
    with Session(main_module.user_authentication.engine) as session:
        user = main_module.user_authentication.User(
            email="ctx@example.com",
            hashed_password=main_module.user_authentication.password_hash.hash("pw"),
            rating=1337,
        )
        session.add(user)
        session.commit()

    request = build_request({"user_email": "ctx@example.com"})
    context = main_module.ctx(request, page="home")

    main_module.chess_logic.make_move("e2e4")
    undo_result = main_module.undo_move()

    assert context["user_email"] == "ctx@example.com"
    assert context["user_rating"] == 1337
    assert context["page"] == "home"
    assert undo_result["history"] == []
    assert undo_result["turn"] == "white"


def test_room_endpoints_manage_room_state(main_module, monkeypatch):
    broadcasts = []

    async def fake_broadcast(room_id, payload):
        broadcasts.append((room_id, payload))

    monkeypatch.setattr(main_module, "broadcast", fake_broadcast)

    room = main_module.create_room(
        main_module.CreateRoomRequest(
            player_one="white",
            player_two="black",
            player_one_email="white@example.com",
            player_two_email="black@example.com",
        )
    )
    room_id = room["room_id"]

    move_result = asyncio.run(
        main_module.submit_move(
            main_module.MoveRequest(room_id=room_id, player="white", move="e2e4")
        )
    )
    voice_result = main_module.parse_room_voice(
        main_module.RoomVoiceInput(
            room_id=room_id,
            player="black",
            transcript="e7 to e5",
        )
    )
    leave_result = asyncio.run(
        main_module.leave_room(
            main_module.LeaveRequest(room_id=room_id, player="white")
        )
    )
    deleted = main_module.delete_room(room_id)

    assert "game" not in room
    assert move_result["turn"] == "black"
    assert voice_result["status"] == "exact"
    assert leave_result["winner"] == "black"
    assert "deleted" in deleted["detail"]
    assert broadcasts


def test_voice_transcribe_returns_server_side_fallback(main_module, monkeypatch):
    fake_openai = types.ModuleType("openai")

    class OpenAI:
        def __init__(self, api_key):
            self.api_key = api_key

    fake_openai.OpenAI = OpenAI
    monkeypatch.setitem(sys.modules, "openai", fake_openai)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = asyncio.run(main_module.voice_transcribe(DummyUploadFile(b"audio bytes")))

    assert result["success"] is False
    assert result["fallback_to_browser"] is True
