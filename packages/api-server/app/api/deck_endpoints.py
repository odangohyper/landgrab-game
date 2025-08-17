from fastapi import APIRouter, Header, HTTPException, status
from typing import List, Optional, Dict
from ..game.models import Deck # Import Deck from models.py
from pydantic import BaseModel, Field

from ..db.database import (
    create_deck_in_db,
    get_deck_from_db,
    get_decks_by_client_id_from_db,
    update_deck_in_db,
    delete_deck_from_db,
)

router = APIRouter()

# Pydantic Models are imported from app.game.models

# API Endpoints

@router.post("/decks/", response_model=Deck, status_code=status.HTTP_201_CREATED)
async def create_new_deck(deck: Deck, x_client_id: Optional[str] = Header(None)):
    if not x_client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-Client-Id header is required")
    created_deck = create_deck_in_db(x_client_id, deck.dict(exclude_unset=True)) # exclude_unset for optional id
    return created_deck

@router.get("/decks/", response_model=List[Deck])
async def get_all_decks(x_client_id: Optional[str] = Header(None)):
    if not x_client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-Client-Id header is required")
    decks_dict = get_decks_by_client_id_from_db(x_client_id)
    if not decks_dict:
        return []
    # Convert dictionary of decks to a list
    return list(decks_dict.values())

@router.get("/decks/{deck_id}", response_model=Deck)
async def get_single_deck(deck_id: str, x_client_id: Optional[str] = Header(None)):
    if not x_client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-Client-Id header is required")
    deck = get_deck_from_db(x_client_id, deck_id)
    if deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return deck

@router.put("/decks/{deck_id}", response_model=Deck)
async def update_existing_deck(deck_id: str, deck: Deck, x_client_id: Optional[str] = Header(None)):
    if not x_client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-Client-Id header is required")
    updated_deck = update_deck_in_db(x_client_id, deck_id, deck.dict())
    if updated_deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return updated_deck

@router.delete("/decks/{deck_id}", response_model=Dict[str, str])
async def delete_existing_deck(deck_id: str, x_client_id: Optional[str] = Header(None)):
    if not x_client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-Client-Id header is required")
    result = delete_deck_from_db(x_client_id, deck_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return {"message": f"Deck {deck_id} deleted successfully"}
