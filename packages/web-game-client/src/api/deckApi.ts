import { Deck } from '../types';
import { NullAuthAdapter } from '../auth/NullAuthAdapter'; // Corrected import

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1'; // Use the correct local dev server URL

// Instantiate NullAuthAdapter once
const authAdapterInstance = new NullAuthAdapter();

const getClientIdHeader = () => {
  const clientId = authAdapterInstance.getClientId();
  if (!clientId) {
    console.error("Client ID not found. Please ensure auth adapter is initialized.");
    return {};
  }
  return { 'X-Client-Id': clientId };
};

export async function getDecks(): Promise<Deck[]> {
  console.log('getDecks: Sending request to get all decks.'); // ADDED LOG
  try {
    const response = await fetch(`${API_BASE_URL}/decks/`, {
      headers: getClientIdHeader(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('getDecks: Failed response:', response.status, JSON.stringify(errorData, null, 2)); // IMPROVED LOGGING
      throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : 'Failed to fetch decks'); // IMPROVED ERROR MESSAGE
    }

    const responseData = await response.json(); // Capture response data
    console.log('getDecks: Successful response:', response.status, responseData); // ADDED LOG
    return responseData; // Return captured data
  } catch (error) {
    console.error('getDecks: Error during fetch:', error); // ADDED LOG
    throw error; // Re-throw the error
  }
}

export async function createDeck(deck: Omit<Deck, 'id'>): Promise<Deck> {
  console.log('createDeck: Sending request to create deck:', deck); // ADDED LOG
  try {
    const response = await fetch(`${API_BASE_URL}/decks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getClientIdHeader(),
      },
      body: JSON.stringify(deck),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('createDeck: Failed response:', response.status, JSON.stringify(errorData, null, 2)); // IMPROVED LOGGING
      throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : 'Failed to create deck'); // IMPROVED ERROR MESSAGE
    }

    const responseData = await response.json(); // Capture response data
    console.log('createDeck: Successful response:', response.status, responseData); // ADDED LOG
    return responseData; // Return captured data
  } catch (error) {
    console.error('createDeck: Error during fetch:', error); // ADDED LOG
    throw error; // Re-throw the error
  }
}

export async function getDeck(deckId: string): Promise<Deck> {
  console.log('getDeck: Sending request to get deck:', deckId); // ADDED LOG
  try {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
      headers: getClientIdHeader(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('getDeck: Failed response:', response.status, JSON.stringify(errorData, null, 2)); // IMPROVED LOGGING
      throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : 'Failed to fetch deck'); // IMPROVED ERROR MESSAGE
    }

    const responseData = await response.json(); // Capture response data
    console.log('getDeck: Successful response:', response.status, responseData); // ADDED LOG
    return responseData; // Return captured data
  } catch (error) {
    console.error('getDeck: Error during fetch:', error); // ADDED LOG
    throw error; // Re-throw the error
  }
}

export async function updateDeck(deck: Deck): Promise<Deck> {
  if (!deck.id) {
    throw new Error("Deck must have an ID to be updated.");
  }
  console.log('updateDeck: Sending request to update deck:', deck); // ADDED LOG
  try {
    const response = await fetch(`${API_BASE_URL}/decks/${deck.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getClientIdHeader(),
      },
      body: JSON.stringify(deck),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('updateDeck: Failed response:', response.status, JSON.stringify(errorData, null, 2)); // IMPROVED LOGGING
      throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : 'Failed to update deck'); // IMPROVED ERROR MESSAGE
    }

    const responseData = await response.json(); // Capture response data
    console.log('updateDeck: Successful response:', response.status, responseData); // ADDED LOG
    return responseData; // Return captured data
  } catch (error) {
    console.error('updateDeck: Error during fetch:', error); // ADDED LOG
    throw error; // Re-throw the error
  }
}

export async function deleteDeck(deckId: string): Promise<void> {
  console.log('deleteDeck: Sending request to delete deck:', deckId); // ADDED LOG
  try {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
      method: 'DELETE',
      headers: getClientIdHeader(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('deleteDeck: Failed response:', response.status, JSON.stringify(errorData, null, 2)); // IMPROVED LOGGING
      throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : 'Failed to delete deck'); // IMPROVED ERROR MESSAGE
    }
    console.log('deleteDeck: Successful response:', response.status); // ADDED LOG
  } catch (error) {
    console.error('deleteDeck: Error during fetch:', error); // ADDED LOG
    throw error; // Re-throw the error
  }
}

export async function fetchRecommendedDecks(): Promise<Deck[]> {
  const deckFiles = ['recommended_deck_1.json', 'recommended_deck_2.json', 'recommended_deck_3.json'];
  try {
    const decks = await Promise.all(
      deckFiles.map(async (file) => {
        const response = await fetch(`/decks/${file}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${file}`);
        }
        const deck = await response.json();
        // Add a flag to distinguish recommended decks
        return { ...deck, isRecommended: true };
      })
    );
    return decks;
  } catch (error) {
    console.error('Error fetching recommended decks:', error);
    return [];
  }
}


