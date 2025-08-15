# packages/api-server/app/game/models.py

from pydantic import BaseModel, Field
from typing import List, Literal, Optional

# --- ゲームロジックモデル（web-game-client/src/types.ts と同じものを反映） ---

class Card(BaseModel):
    id: str
    templateId: str

class CardTemplate(BaseModel):
    templateId: str
    name: str
    cost: int
    description: str | None = None
    type: Literal['GAIN_FUNDS', 'ACQUIRE', 'DEFEND', 'FRAUD']
    imageFile: str | None = None

class PlayerState(BaseModel):
    playerId: str
    funds: int
    properties: int
    hand: List[Card] = Field(default_factory=list)
    deck: List[Card] = Field(default_factory=list)
    discard: List[Card] = Field(default_factory=list)

class Action(BaseModel):
    playerId: str
    cardId: str

class ResolvedAction(BaseModel):
    playerId: str
    cardTemplateId: str

class GameState(BaseModel):
    matchId: str
    turn: int
    players: List[PlayerState]
    phase: Literal['DRAW', 'ACTION', 'RESOLUTION', 'GAME_OVER']
    lastActions: List[ResolvedAction] = Field(default_factory=list)
    log: List[str] = Field(default_factory=list)

# Deckクラスを追加
class Deck(BaseModel):
    id: Optional[str] = None  # Optional for creation, will be assigned by backend
    name: str
    cards: List[CardTemplate] # A list of CardTemplate objects