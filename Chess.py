import chess

# Create a new chess board
board = chess.Board()

print("Chess Demo")
print("=" * 40)
print("\nStarting position:")
print(board)
print()

# Make some simple moves
moves = [
    ("e2e4", "White moves pawn to e4 (King's pawn opening)"),
    ("e7e5", "Black responds with pawn to e5"),
    ("g1f3", "White develops knight to f3"),
    ("b8c6", "Black develops knight to c6"),
]

for move_notation, description in moves:
    move = chess.Move.from_uci(move_notation)
    board.push(move)
    print(f"Move: {description}")
    print(board)
    print()

# Show game information
print("=" * 40)
print("Game Status:")
print(f"Turn: {'White' if board.turn == chess.WHITE else 'Black'}")
print(f"Legal moves available: {board.legal_moves.count()}")
print(f"Is check? {board.is_check()}")
print(f"Is checkmate? {board.is_checkmate()}")
print(f"Is stalemate? {board.is_stalemate()}")