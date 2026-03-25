import chess
import TTS
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
"""
Testing - Run the server 
http://127.0.0.1:8000/state - shows everything

Copy paste(legal move): 
curl -X POST http://127.0.0.1:8000/move \
  -H "Content-Type: application/json" \
  -d '{"move":"e2e4"}'

(illegal move -- Pawn can't go 4 spots):  
curl -X POST http://127.0.0.1:8000/move \
  -H "Content-Type: application/json" \
  -d '{"move":"e2e5"}' 
  
curl -X POST http://127.0.0.1:8000/reset

Front End is not implemented yet.

"""

board = chess.Board()

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
    san = board.san(move)
    board.push(move)

    TTS.speak(f"Played {san}")
    return {
        "success": True,
        "message": f"Played{san}",
        **get_game_state(),
    }

def reset_game():
    board.reset()
    return {
        "success": True,
        "message": "Reset game",
        **get_game_state(),
    }