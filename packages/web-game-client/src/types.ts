// packages/web-game-client/src/types.ts

// Based on specs/game_state.json
export interface Card {
  id: string;
  templateId: string;
}

export interface CardTemplate {
  templateId: string;
  name: string;
  cost: number;
  description?: string;
  type: 'GAIN_FUNDS' | 'ACQUIRE' | 'DEFEND' | 'FRAUD';
}

export interface PlayerState {
  playerId: string;
  funds: number;
  properties: number;
  hand: Card[];
  deck: Card[];
  discard: Card[];
}

export interface GameState {
  matchId: string;
  turn: number;
  players: PlayerState[];
  phase: 'DRAW' | 'ACTION' | 'RESOLUTION';
}

export interface Action {
  playerId: string;
  cardId: string; // The ID of the card played
}
