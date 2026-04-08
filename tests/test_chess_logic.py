import os
import sys
from pathlib import Path

import chess


ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import chess_logic


def setup_function():
    chess_logic.reset_game()


def teardown_function():
    chess_logic.reset_game()


def test_make_move_updates_turn_history_and_message():
    result = chess_logic.make_move("e2e4")

    assert result["success"] is True
    assert result["turn"] == "black"
    assert result["history"] == ["e4"]
    assert result["message"] == "Played e4"
    assert result["spoken_text"] == "White pawn played from E two to E four"


def test_invalid_and_illegal_moves_return_errors():
    invalid = chess_logic.make_move("bad move")
    illegal = chess_logic.make_move("e2e5")

    assert invalid["success"] is False
    assert invalid["error"] == "Use correct move like e2e4"
    assert illegal["success"] is False
    assert illegal["error"] == "Illegal move"


def test_gameboard_tracks_moves_and_can_reset():
    game = chess_logic.GameBoard()

    move_result = game.make_move("d2d4")
    reset_result = game.reset_game()

    assert move_result["success"] is True
    assert move_result["history"] == ["d4"]
    assert reset_result["success"] is True
    assert reset_result["history"] == []
    assert reset_result["turn"] == "white"


def test_capture_text_and_winner_helpers_work():
    board = chess.Board("8/8/8/4p3/3P4/8/8/8 w - - 0 1")
    capture = chess.Move.from_uci("d4e5")

    captured_piece = chess_logic.captured_piece_for_move_for_board(board, capture)
    spoken_text = chess_logic.spoken_move_text_for_board(board, capture)

    mate_game = chess_logic.GameBoard()
    for move_text in ("f2f3", "e7e5", "g2g4", "d8h4"):
        mate_game.make_move(move_text)

    mate_state = mate_game.get_game_state()

    assert captured_piece.symbol() == "p"
    assert spoken_text == "White pawn played from D four to E five and took the Black pawn"
    assert mate_state["checkmate"] is True
    assert mate_state["winner"] == "black"
