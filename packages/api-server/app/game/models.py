# packages/api-server/app/game/models.py

import uuid
from pydantic import BaseModel, Field
from typing import List, Dict

# --- Deck Management Models ---

class CardInDeck(BaseModel):
    templateId: str
    count: int

class Deck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    cards: List[CardInDeck]

# --- Game Logic Models (mirroring types.ts) ---

class Action(BaseModel):
    playerId: str
    cardId: str

class Card(BaseModel):
    id: str
    templateId: str

class PlayerState(BaseModel):
    playerId: str
    funds: int
    properties: int
    hand: List[Card] = []
    deck: List[Card] = []
    discard: List[Card] = []

class GameState(BaseModel):
    matchId: str
    turn: int
    players: List[PlayerState]
    phase: str # 'DRAW' | 'ACTION' | 'RESOLUTION' | 'GAME_OVER'
    lastActions: List[Dict] = [] # Simplified for now
