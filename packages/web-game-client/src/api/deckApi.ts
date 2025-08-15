import { Deck } from '../types'; // Assuming Deck type is defined in types.ts

const API_BASE_URL = '/api/v1'; // Base URL for your FastAPI backend

export async function createDeck(deck: Deck): Promise<Deck> {
  const response = await fetch(`${API_BASE_URL}/decks/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deck),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to create deck');
  }

  return response.json();
}

export async function getDeck(deckId: string): Promise<Deck> {
  const response = await fetch(`${API_BASE_URL}/decks/${deckId}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to fetch deck');
  }

  return response.json();
}

export async function updateDeck(deck: Deck): Promise<Deck> {
  if (!deck.id) {
    throw new Error("Deck must have an ID to be updated.");
  }
  const response = await fetch(`${API_BASE_URL}/decks/${deck.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deck),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to update deck');
  }

  return response.json();
}
