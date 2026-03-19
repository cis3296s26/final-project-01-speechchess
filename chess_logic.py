import chess

board = chess.Board()

def make_move(move_str):
    move = chess.Move.from_uci(move_str)

    if move in board.legal_moves:
        board.push(move)
        return {
            "success": True,
            "board": str(board),
            "turn": "white" if board.turn else "black"
        }
    else:
        return {"success": False, "error": "Illegal move"}

def get_board():
    return str(board)