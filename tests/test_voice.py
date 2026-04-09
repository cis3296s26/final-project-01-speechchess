import os
import sys
from pathlib import Path

import chess


ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import Voice
import chess_logic


def setup_function():
    chess_logic.reset_game()


def teardown_function():
    chess_logic.reset_game()


def test_normalize_rewrites_common_voice_input():
    assert Voice.normalize("Knight to F three") == "knight to f3"
    assert Voice.normalize("E two to E four please") == "e2 to e4"


def test_parse_speech_matches_exact_square_move():
    result = Voice.parse_speech("e2 to e4")

    assert result["status"] == "exact"
    assert result["move"]["uci"] == "e2e4"
    assert result["move"]["san"] == "e4"


def test_parse_speech_matches_castle_and_san_moves():
    castle_board = chess.Board("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
    castle_result = Voice.parse_speech("castle kingside", castle_board)
    san_result = Voice.parse_speech("nf3")

    assert castle_result["status"] == "exact"
    assert castle_result["move"]["uci"] == "e1g1"
    assert san_result["status"] == "exact"
    assert san_result["move"]["uci"] == "g1f3"


def test_parse_speech_reports_ambiguous_and_invalid_input():
    board = chess.Board("8/8/8/8/8/2N3N1/8/8 w - - 0 1")

    ambiguous = Voice.parse_speech("knight e4", board)
    invalid = Voice.parse_speech("do something else")

    assert ambiguous["status"] == "ambiguous"
    assert sorted(option["uci"] for option in ambiguous["options"]) == ["c3e4", "g3e4"]
    assert invalid["status"] == "invalid"
    assert Voice.speech_to_move("do something else") is None
