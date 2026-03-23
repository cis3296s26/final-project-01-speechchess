# Voice.py

import re
import chess_logic

def normalize(text):
    text = text.lower()

    replacements = {
        "night": "knight",
        "see": "c",
        "bee": "b",
        "dee": "d",
        "gee": "g",
        "eight": "8",
        "ate": "8"
    }

    for k, v in replacements.items():
        text = text.replace(k, v)

    return text


def speech_to_move(text):
    text = normalize(text)

    squares = re.findall(r"[a-h][1-8]", text)

    if not squares:
        return None

    target = squares[-1]

    state = chess_logic.get_game_state()
    legal_moves = state["legal_moves"]

    candidates = [m for m in legal_moves if m[2:] == target]

    if len(candidates) == 1:
        return candidates[0]

    if len(candidates) > 1:
        return candidates[0]

    return None