# Voice.py

import re
import chess
import chess_logic

PIECE_NAMES = {
    "pawn": chess.PAWN,
    "knight": chess.KNIGHT,
    "bishop": chess.BISHOP,
    "rook": chess.ROOK,
    "queen": chess.QUEEN,
    "king": chess.KING,
}

PIECE_ALIASES = {
    "n": chess.KNIGHT,
    "b": chess.BISHOP,
    "r": chess.ROOK,
    "q": chess.QUEEN,
    "k": chess.KING,
}


def normalize(text):
    text = text.lower().strip()

    replacements = {
        "night": "knight",
        "nite": "knight",
        "horse": "knight",
        "look": "rook",
        "brook": "rook",
        "see": "c",
        "sea": "c",
        "cee": "c",
        "bee": "b",
        "be": "b",
        "dee": "d",
        "gee": "g",
        "jay": "j",
        "aitch": "h",
        "age": "h",
        "won": "1",
        "one": "1",
        "two": "2",
        "too": "2",
        "three": "3",
        "free": "3",
        "four": "4",
        "for": "4",
        "five": "5",
        "six": "6",
        "seven": "7",
        "eight": "8",
        "ate": "8",
        "takes": "capture",
        "take": "capture",
        "captures": "capture",
        "x": "capture",
        "checkmate": "mate",
        "king side": "kingside",
        "queen side": "queenside",
    }

    for source, target in replacements.items():
        text = re.sub(rf"\b{re.escape(source)}\b", target, text)

    text = re.sub(r"\b([a-h][1-8])\s*(?:to|2)\s*([a-h][1-8])\b", r"\1 \2", text)
    text = re.sub(r"\b([a-h][1-8])2([a-h][1-8])\b", r"\1 \2", text)
    text = re.sub(r"\b([a-h][1-8])([a-h][1-8])\b", r"\1 \2", text)
    text = re.sub(r"\b(move|on|please|the|a|an|my|from)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\b([a-h])\s+([1-8])\b", r"\1\2", text)
    text = re.sub(r"\b([nbrqk])\s+([a-h][1-8])\b", r"\1\2", text)

    return text


def board(board_obj=None):
    if board_obj is not None:
        return board_obj
    return chess_logic.board


def spoken_move_label(move, board_obj=None):
    current_board = board(board_obj)
    piece = current_board.piece_at(move.from_square)
    from_square = chess.square_name(move.from_square)
    to_square = chess.square_name(move.to_square)

    if piece is None:
        return f"{from_square} to {to_square}"

    piece_name = chess.piece_name(piece.piece_type)
    return f"{piece_name} from {from_square} to {to_square}"


def move_payload(move, board_obj=None):
    current_board = board(board_obj)
    return {
        "uci": move.uci(),
        "from_square": chess.square_name(move.from_square),
        "to_square": chess.square_name(move.to_square),
        "spoken": spoken_move_label(move, current_board),
        "san": current_board.san(move),
    }


def extract_squares(text):
    return re.findall(r"\b([a-h][1-8])\b", text)


def extract_piece_type(text):
    for name, piece_type in PIECE_NAMES.items():
        if re.search(rf"\b{name}\b", text):
            return piece_type

    match = re.search(r"\b([nbrqk])([a-h][1-8])\b", text)
    if match:
        return PIECE_ALIASES.get(match.group(1))

    return None


def castle_side(text):
    if "castle" not in text:
        return None
    if "queenside" in text or "long" in text:
        return "queenside"
    if "kingside" in text or "short" in text:
        return "kingside"
    return "kingside"


def wants_capture(text):
    return "capture" in text


def san_candidate(text):
    compact = text.replace(" ", "")
    if re.fullmatch(r"[nbrqk]?[a-h][1-8]", compact):
        return compact.upper()
    return None


def exact_square_move(text, board_obj=None):
    current_board = board(board_obj)
    squares = extract_squares(text)
    if len(squares) < 2:
        return None

    candidate = squares[0] + squares[1]

    try:
        move = chess.Move.from_uci(candidate)
    except ValueError:
        return None

    if move in current_board.legal_moves:
        return move

    return None


def exact_castle_move(text, board_obj=None):
    current_board = board(board_obj)
    side = castle_side(text)
    if side is None:
        return None

    for move in current_board.legal_moves:
        if not current_board.is_castling(move):
            continue

        target_file = chess.square_file(move.to_square)
        if side == "kingside" and target_file == 6:
            return move
        if side == "queenside" and target_file == 2:
            return move

    return None


def exact_san_move(text, board_obj=None):
    current_board = board(board_obj)
    candidate = san_candidate(text)
    if candidate is None:
        return None

    for move in current_board.legal_moves:
        san = current_board.san(move).replace("+", "").replace("#", "")
        if san.lower() == candidate.lower():
            return move

    return None


def matching_moves(text, board_obj=None):
    current_board = board(board_obj)
    squares = extract_squares(text)
    if not squares:
        return []

    target_index = chess.parse_square(squares[-1])
    piece_type = extract_piece_type(text)
    capture_only = wants_capture(text)
    matches = []

    for move in current_board.legal_moves:
        if move.to_square != target_index:
            continue

        piece = current_board.piece_at(move.from_square)
        if piece is None:
            continue

        if piece_type is not None and piece.piece_type != piece_type:
            continue

        if capture_only and not current_board.is_capture(move):
            continue

        matches.append(move)

    return matches


def parse_speech(text, board_obj=None):
    normalized = normalize(text)
    print("TEXT:", normalized)

    current_board = board(board_obj)

    move = exact_square_move(normalized, current_board)
    if move is not None:
        return {
            "status": "exact",
            "transcript": normalized,
            "move": move_payload(move, current_board),
            "prompt": f"I heard {spoken_move_label(move, current_board)}.",
        }

    move = exact_castle_move(normalized, current_board)
    if move is not None:
        return {
            "status": "exact",
            "transcript": normalized,
            "move": move_payload(move, current_board),
            "prompt": f"I heard {spoken_move_label(move, current_board)}.",
        }

    move = exact_san_move(normalized, current_board)
    if move is not None:
        return {
            "status": "exact",
            "transcript": normalized,
            "move": move_payload(move, current_board),
            "prompt": f"I heard {spoken_move_label(move, current_board)}.",
        }

    matches = matching_moves(normalized, current_board)
    if len(matches) == 1:
        move = matches[0]
        return {
            "status": "exact",
            "transcript": normalized,
            "move": move_payload(move, current_board),
            "prompt": f"I heard {spoken_move_label(move, current_board)}.",
        }

    if len(matches) > 1:
        options = [move_payload(move, current_board) for move in matches]
        prompts = ", or ".join(
            f"{option['from_square']} to {option['to_square']}" for option in options
        )
        return {
            "status": "ambiguous",
            "transcript": normalized,
            "options": options,
            "prompt": f"That move is ambiguous. Say {prompts}.",
        }

    return {
        "status": "invalid",
        "transcript": normalized,
        "prompt": "I could not match that to a legal move.",
    }


def speech_to_move(text):
    result = parse_speech(text)
    if result["status"] != "exact":
        return None
    return result["move"]["uci"]
