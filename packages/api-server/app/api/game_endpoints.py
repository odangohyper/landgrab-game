# packages/api-server/app/api/game_endpoints.py

from fastapi import APIRouter, HTTPException
from ..game.engine import GameEngine
from ..game.models import GameState, Action

router = APIRouter()

# In-memory store for games
games: dict[str, GameEngine] = {}

# Mock card templates for now
mock_card_templates = {
    'GAIN_FUNDS': { 'templateId': 'GAIN_FUNDS', 'name': '資金集め', 'cost': 0, 'type': 'GAIN_FUNDS' },
    'ACQUIRE': { 'templateId': 'ACQUIRE', 'name': '買収', 'cost': 2, 'type': 'ACQUIRE' },
    'DEFEND': { 'templateId': 'DEFEND', 'name': '防衛', 'cost': 0, 'type': 'DEFEND' },
    'FRAUD': { 'templateId': 'FRAUD', 'name': '詐欺', 'cost': 1, 'type': 'FRAUD' },
}

@router.post("/games/", response_model=GameState)
async def create_game(player1_id: str = "player1", player2_id: str = "npc"):
    """Creates a new game and returns the initial state."""
    initial_state = GameEngine.create_initial_state(player1_id, player2_id)
    engine = GameEngine(initial_state, mock_card_templates)
    games[initial_state.matchId] = engine
    return initial_state

@router.post("/games/{match_id}/action", response_model=GameState)
async def submit_action(match_id: str, action: Action):
    """Submits a player action to the game engine."""
    if match_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    engine = games[match_id]
    # This is a simplified placeholder. In a real scenario, we'd need to handle
    # collecting actions from both players before calling apply_actions.
    # For now, we'll just log it.
    print(f"Received action from {action.playerId} for match {match_id}")
    # new_state = engine.apply_actions(action, None) # Placeholder for opponent action
    # games[match_id] = GameEngine(new_state) # Update engine with new state
    return engine.get_state()
