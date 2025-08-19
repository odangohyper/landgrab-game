// packages/web-game-client/src/types.ts

// --- Core Game State Interfaces ---

export interface Card {
  id: string; // An instance ID, e.g., "ACQUIRE-12345"
  templateId: string; // The master ID, e.g., "ACQUIRE"
}

export interface PlayerState {
  playerId: string;
  funds: number;
  properties: number;
  hand: Card[];
  deck: Card[];
  discard: Card[];
}

export type GameResult = 'WIN' | 'LOSE' | 'DRAW' | 'IN_PROGRESS';

export interface GameState {
  matchId: string;
  turn: number;
  players: PlayerState[];
  phase: 'DRAW' | 'ACTION' | 'RESOLUTION' | 'GAME_OVER';
  result: GameResult;
  lastActions: ResolvedAction[];
  log:string[];
}

// --- Action Interfaces ---

export interface Action {
  playerId: string;
  actionType: 'play_card' | 'collect_funds';
  cardId?: string; // Only for 'play_card'
}

export interface ResolvedAction {
  playerId: string;
  cardTemplateId: string;
}

// --- Card Definition Interfaces (Data-Driven Design) ---

export type EffectName = 'ACQUIRE_PROPERTY' | 'GAIN_FUNDS' | 'BLOCK_ACTION' | 'CANCEL_EFFECT';
export type EffectTarget = 'SELF' | 'OPPONENT' | 'NONE';
export type CardCategory = 'ATTACK' | 'DEFENSE' | 'SUPPORT';

export interface EffectAction {
  name: EffectName;
  value?: number;
  conditions?: { [key: string]: any }; // e.g., { opponentCardCategory: 'ATTACK' }
}

export interface CardTemplate {
  templateId: string;    // e.g., "ACQUIRE", "BRIBE"
  serialId: string;      // e.g., "010-001"
  name: string;          // e.g., "買収", "賄賂"
  cost: number;
  illustPath: string;    // e.g., "images/cards/010-001.jpg"
  flavorText: string;    // e.g., "ビジネスに綺麗事は不要ですわ"
  
  effect: {
    category: CardCategory;
    priority: number;      // Higher number resolves first
    target: EffectTarget;
    actions: EffectAction[];
  };
}

// --- Deck Management Interfaces ---

export type EffectHandler = (
  state: GameState,
  actingPlayerId: string,
  opponentPlayerId: string, // Some effects might need opponent's ID
  effectAction: EffectAction // Some effects might need the full EffectAction (e.g., for value)
) => GameState;

export interface Deck {
  id?: string;
  name: string;
  cards: { [templateId: string]: number }; // e.g., { "ACQUIRE": 2, "DEFEND": 2 }
}
