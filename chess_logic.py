import chess
"""
WILL DELETE LATER BUT FOR YOU GUYS RIGHT NOW
Methods and attributes from chess import:
https://python-chess.readthedocs.io/en/latest/core.html
    .reset() 
    .fen()
    .result()
    .push(move)
    .is_check()
    .is_checkmate()
    .is_stalemate()
    .is_game_over()
    .san(move)
"""


# chess_logic.py — add this class at the bottom
board = chess.Board()
RANK_WORDS = {
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "five",
    "6": "six",
    "7": "seven",
    "8": "eight",
}

class GameBoard:
    def __init__(self):
        self.board = chess.Board()

    def serialize_board(self):
        rows = []
        for rank in range(7, -1, -1):
            row = []
            for file_index in range(8):
                square = chess.square(file_index, rank)
                piece = self.board.piece_at(square)
                row.append({
                    "square": chess.square_name(square),
                    "piece": piece.symbol() if piece else None,
                })
            rows.append(row)
        return rows

    def move_history(self):
        replay_board = chess.Board()
        history = []
        for move in self.board.move_stack:
            history.append(replay_board.san(move))
            replay_board.push(move)
        return history

    def winner(self):
        if not self.board.is_checkmate():
            return None
        return "black" if self.board.turn == chess.WHITE else "white"

    def get_game_state(self):
        return {
            "board": self.serialize_board(),
            "turn": "white" if self.board.turn == chess.WHITE else "black",
            "check": self.board.is_check(),
            "checkmate": self.board.is_checkmate(),
            "stalemate": self.board.is_stalemate(),
            "game_over": self.board.is_game_over(),
            "winner": self.winner(),
            "result": self.board.result() if self.board.is_game_over() else None,
            "fen": self.board.fen(),
            "history": self.move_history(),
            "legal_moves": [m.uci() for m in self.board.legal_moves],
        }

    def make_move(self, move_str):
        move_text = move_str.strip().lower().replace(" ", "")
        try:
            move = chess.Move.from_uci(move_text)
        except ValueError:
            return {"success": False, "error": "Use correct move like e2e4", **self.get_game_state()}
        if move not in self.board.legal_moves:
            return {"success": False, "error": "Illegal move", **self.get_game_state()}
        spoken_text = spoken_move_text_for_board(self.board, move)
        san = self.board.san(move)
        self.board.push(move)
        return {
            "success": True,
            "message": f"Played {san}",
            "spoken_text": spoken_text,
            **self.get_game_state(),
        }

    def reset_game(self):
        self.board.reset()
        return {"success": True, "message": "Reset game", **self.get_game_state()}

def serialize_board():
    rows = []
    for rank in range(7,-1,-1): #loop from top down, rank(row) 7 to zero (8 to 1)
        row = []
        for file_index in range(8): #loop through columns
            square = chess.square(file_index, rank) #square index ex (0,0) -> a1
            piece = board.piece_at(square) #get the piece on square
            if piece is not None:
                piece_value = piece.symbol()
            else:
                piece_value = None
            row.append(
                {
                    "square": chess.square_name(square),
                    "piece": piece_value,
                } #add a dictionary for each square
            )
        rows.append(row) # adding completed row to the board
    return rows #return full 8x8

def move_history():
    replay_board = chess.Board() #(create a board to replay moves from start)
    history = []
    for move in board.move_stack: #move_stack all move played so far
        history.append(replay_board.san(move)) #san is the standard chest notation ex e4, Nf3
        replay_board.push(move) #apply it to replay board
    return history

def winner():
    if not board.is_checkmate():
        return None
    if board.turn == chess.WHITE:
        return "black"
    else:
        return "white"

def get_game_state():
    if board.turn == chess.WHITE:
        turn_value = "white"
    else:
        turn_value = "black"
    if board.is_game_over():
        result_value = board.result()
    else:
        result_value = None
    legal_moves_list = []
    for move in board.legal_moves:
        legal_moves_list.append(move.uci())
    return {
        "board": serialize_board(),
        "turn": turn_value,
        "check": board.is_check(),
        "checkmate": board.is_checkmate(),
        "stalemate": board.is_stalemate(),
        "game_over": board.is_game_over(),
        "winner": winner(),
        "result": result_value,
        "fen": board.fen(), #FEN is a snapshot of the entire board in one line
        "history": move_history(),
        "legal_moves": legal_moves_list,
    }

def spoken_square(square):
    name = chess.square_name(square)
    return f"{name[0].upper()} {RANK_WORDS[name[1]]}"

def captured_piece_for_move_for_board(active_board, move):
    if not active_board.is_capture(move):
        return None

    if active_board.is_en_passant(move):
        offset = -8 if active_board.turn == chess.WHITE else 8
        return active_board.piece_at(move.to_square + offset)

    return active_board.piece_at(move.to_square)

def spoken_move_text_for_board(active_board, move):
    piece = active_board.piece_at(move.from_square)
    captured_piece = captured_piece_for_move_for_board(active_board, move)
    from_square = spoken_square(move.from_square)
    to_square = spoken_square(move.to_square)

    if piece is None:
        return f"Played from {from_square} to {to_square}"

    color = "White" if piece.color == chess.WHITE else "Black"
    piece_name = chess.piece_name(piece.piece_type)

    if captured_piece is not None:
        captured_color = "White" if captured_piece.color == chess.WHITE else "Black"
        captured_name = chess.piece_name(captured_piece.piece_type)
        return (
            f"{color} {piece_name} played from {from_square} to {to_square} "
            f"and took the {captured_color} {captured_name}"
        )

    return f"{color} {piece_name} played from {from_square} to {to_square}"

def captured_piece_for_move(move):
    return captured_piece_for_move_for_board(board, move)

def spoken_move_text(move):
    return spoken_move_text_for_board(board, move)

def make_move(move_str): #ex: e2e4
    move_text = move_str.strip().lower().replace(" ", "")
    try:
        move = chess.Move.from_uci(move_text) #from chess class convert input string to move object
    except ValueError:
        return {
            "success": False,
            "error": "Use correct move like e2e4",
            **get_game_state(), #** copy a dictionary into another dictionary
        }
    if move not in board.legal_moves:
        return {
            "success": False,
            "error": "Illegal move",
            **get_game_state(),
        }
    spoken_text = spoken_move_text(move)
    san = board.san(move)
    board.push(move)

    return {
        "success": True,
        "message": f"Played {san}",
        "spoken_text": spoken_text,
        **get_game_state(),
    }

def reset_game():
    board.reset()
    return {
        "success": True,
        "message": "Reset game",
        **get_game_state(),
    }
