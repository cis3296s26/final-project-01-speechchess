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


def normalize(text):
    text = text.lower().strip()

    replacements = {
        "night": "knight",
        "nite": "knight",
        "see": "c",
        "sea": "c",
        "bee": "b",
        "be": "b",
        "dee": "d",
        "gee": "g",
        "eight": "8",
        "ate": "8",
        "one": "1",
        "two": "2",
        "three": "3",
        "four": "4",
        "for": "4",
        "five": "5",
        "six": "6",
        "seven": "7",
    }

    for source, target in replacements.items():
        text = re.sub(rf"\b{re.escape(source)}\b", target, text)

    text = re.sub(r"\b(move|to|on|please|the|a|an)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\b([a-h])\s+([1-8])\b", r"\1\2", text)

    return text


def extract_target_square(text):
    squares = re.findall(r"\b([a-h][1-8])\b", text)
    if not squares:
        return None
    return squares[-1]


def extract_piece_type(text):
    for name, piece_type in PIECE_NAMES.items():
        if re.search(rf"\b{name}\b", text):
            return piece_type
    return None


def castle_side(text):
    if "castle" not in text:
        return None
    if "queenside" in text or "queen side" in text or "long" in text:
        return "queenside"
    if "kingside" in text or "king side" in text or "short" in text:
        return "kingside"
    return "kingside"


def castle_move(board, side):
    legal_moves = list(board.legal_moves)

    for move in legal_moves:
        if not board.is_castling(move):
            continue

        target_file = chess.square_file(move.to_square)

        if side == "kingside" and target_file == 6:
            return move.uci()
        if side == "queenside" and target_file == 2:
            return move.uci()

    return None


def match_legal_moves(board, target_square, piece_type):
    target_index = chess.parse_square(target_square)
    candidates = []

    for move in board.legal_moves:
        if move.to_square != target_index:
            continue

        piece = board.piece_at(move.from_square)
        if piece is None:
            continue

        if piece_type is not None and piece.piece_type != piece_type:
            continue

        candidates.append(move.uci())

    if len(candidates) == 1:
        return candidates[0]

    return None


def speech_to_move(text):
    text = normalize(text)
    print("TEXT:", text)

    board = chess_logic.board

    side = castle_side(text)
    if side is not None:
        move = castle_move(board, side)
        print("CASTLE:", move)
        return move

    target_square = extract_target_square(text)
    print("TARGET:", target_square)

    if target_square is None:
        return None

    piece_type = extract_piece_type(text)
    print("PIECE TYPE:", piece_type)

    move = match_legal_moves(board, target_square, piece_type)
    print("MATCH:", move)

    return move
