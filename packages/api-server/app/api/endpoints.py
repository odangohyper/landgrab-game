from fastapi import APIRouter, HTTPException
from typing import Dict
import uuid

from ..game.models import Deck
from ..db.database import get_db

router = APIRouter()

@router.post("/decks/", response_model=Deck)
async def create_deck(deck: Deck):
    db = get_db()
    ref = db.reference('decks')
    
    if not deck.id:
        deck.id = str(uuid.uuid4()) # Assign a new ID if not provided
    
    ref.child(deck.id).set(deck.model_dump())
    return deck

@router.get("/decks/{deck_id}", response_model=Deck)
async def get_deck(deck_id: str):
    db = get_db()
    ref = db.reference(f'decks/{deck_id}')
    deck_data = ref.get()
    
    if not deck_data:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    return Deck(**deck_data)

@router.put("/decks/{deck_id}", response_model=Deck)
async def update_deck(deck_id: str, deck: Deck):
    db = get_db()
    ref = db.reference(f'decks/{deck_id}')
    
    # Check if deck exists
    existing_deck = ref.get()
    if not existing_deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Ensure the ID in the path matches the ID in the request body
    if deck_id != deck.id:
        raise HTTPException(status_code=400, detail="Deck ID in path does not match ID in request body")

    ref.set(deck.model_dump())
    return deck