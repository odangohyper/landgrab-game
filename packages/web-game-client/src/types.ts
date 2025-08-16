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
  type: 'ACQUIRE' | 'DEFEND' | 'FRAUD';
  imageFile?: string; // New property for image file name
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
  phase: 'DRAW' | 'ACTION' | 'RESOLUTION' | 'GAME_OVER';
  lastActions: ResolvedAction[];
  log: string[];
}

export interface Action {
  playerId: string;
  actionType: 'play_card' | 'collect_funds'; // アクションの種類を明示
  cardId?: string; // 'play_card' の場合のみ使用
}

export interface ResolvedAction {
  playerId: string;
  cardTemplateId: string;
}
