from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel

from ..game.models import GameState, Action, PlayerState, Card, CardTemplate
from ..game.engine import GameEngine

router = APIRouter()

class ApplyActionRequest(BaseModel):
    game_state: GameState
    action: Action

@router.post("/game/apply_action", response_model=GameState)
async def apply_game_action(request: ApplyActionRequest):
    engine = GameEngine(initial_game_state=request.game_state)
    
    # Assuming apply_action modifies the game_state in place or returns a new one
    # Based on engine.py, it seems to return a new GameState
    updated_game_state = engine.apply_action(request.game_state, request.action)
    
    return updated_game_state

class ResolveTurnRequest(BaseModel):
    game_state: GameState
    player_action: Action
    npc_action: Action

@router.post("/game/resolve_turn", response_model=GameState)
async def resolve_game_turn(request: ResolveTurnRequest):
    engine = GameEngine(initial_game_state=request.game_state)
    
    # Assuming resolve_actions takes the current state and both actions
    updated_game_state = engine.resolve_actions(
        current_state=request.game_state,
        player_action=request.player_action,
        npc_action=request.npc_action
    )
    
    return updated_game_state

class AdvanceTurnRequest(BaseModel):
    game_state: GameState

@router.post("/game/advance_turn", response_model=GameState)
async def advance_game_turn(request: AdvanceTurnRequest):
    engine = GameEngine(initial_game_state=request.game_state)
    
    # Assuming advance_turn returns a new GameState
    updated_game_state = engine.advance_turn(request.game_state)
    
    return updated_game_state