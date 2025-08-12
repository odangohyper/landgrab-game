# packages/api-server/app/api/endpoints.py

from fastapi import APIRouter, HTTPException
from typing import Dict
import uuid

from ..game.models import Deck

router = APIRouter()

# In-memory database
db_decks: Dict[str, Deck] = {}

@router.post("/decks/", response_model=Deck)
async def create_deck(deck: Deck):
    deck.id = str(uuid.uuid4()) # Assign a new ID
    db_decks[deck.id] = deck
    return deck

@router.get("/decks/{deck_id}", response_model=Deck)
async def get_deck(deck_id: str):
    if deck_id not in db_decks:
        raise HTTPException(status_code=404, detail="Deck not found")
    return db_decks[deck_id]

@router.put("/decks/{deck_id}", response_model=Deck)
async def update_deck(deck_id: str, deck: Deck):
    if deck_id not in db_decks:
        raise HTTPException(status_code=404, detail="Deck not found")
    db_decks[deck_id] = deck
    return db_decks[deck_id]
