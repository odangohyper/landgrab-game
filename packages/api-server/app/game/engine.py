import random
import time
from typing import Dict, List, Optional

from app.game.cards import (apply_acquire, apply_defend, apply_fraud,
                            apply_gain_funds)
from app.game.models import (Action, Card, CardTemplate, GameState,
                             PlayerState, ResolvedAction)


class GameEngine:
    def __init__(self, initial_state: GameState, card_templates: Dict[str, CardTemplate]):
        # Python Pydantic models handle initialization, so no need for hydration
        self.state = initial_state
        self.card_templates = card_templates

    def get_state(self) -> GameState:
        return self.state.copy(deep=True)

    def apply_action(self, player1_action: Optional[Action], player2_action: Optional[Action]) -> GameState:
        if self.state.phase == 'GAME_OVER':
            return self.get_state()

        new_state = self.get_state()
        
        resolved_actions = self._resolve_actions(new_state, player1_action, player2_action)
        new_state.lastActions = resolved_actions
        
        self._check_win_condition(new_state)
        
        self.state = new_state
        return self.get_state()

    def advance_turn(self) -> GameState:
        if self.state.phase == 'GAME_OVER':
            return self.get_state()

        self.state.turn += 1
        self.state.phase = 'DRAW'
        self.state.lastActions = []
        self.state.log.append(f"--- ターン {self.state.turn} ---")

        for player in self.state.players:
            cards_to_draw = 3 - len(player.hand)
            if cards_to_draw > 0:
                self._draw_cards(player, cards_to_draw)
        
        self.state.phase = 'ACTION'
        return self.get_state()

    def get_card_template(self, template_id: str) -> Optional[CardTemplate]:
        return self.card_templates.get(template_id)

    @staticmethod
    def create_initial_state(player1_id: str, player2_id: str, card_templates: Dict[str, CardTemplate]) -> GameState:
        initial_deck = []
        for t in card_templates.values():
            count = 4 if t.name == '資金集め' else 2
            for _ in range(count):
                initial_deck.append(t.templateId)

        def create_player(p_id: str) -> PlayerState:
            deck_cards = [Card(id=f"card{i}_{tid}", templateId=tid) for i, tid in enumerate(initial_deck)]
            random.shuffle(deck_cards)
            return PlayerState(
                playerId=p_id,
                funds=2,
                properties=1,
                deck=deck_cards
            )

        return GameState(
            matchId=f"match-{int(time.time())}",
            turn=0,
            players=[create_player(player1_id), create_player(player2_id)],
            phase='DRAW',
            log=['ゲーム開始！']
        )

    def _draw_cards(self, player: PlayerState, count: int) -> None:
        for _ in range(count):
            if not player.deck:
                if not player.discard:
                    break
                player.deck = player.discard
                player.discard = []
                random.shuffle(player.deck)
            
            drawn_card = player.deck.pop(0)
            player.hand.append(drawn_card)

    def _apply_card_effect(self, state: GameState, player: PlayerState, card: Card, opponent: PlayerState) -> None:
        card_template = self.get_card_template(card.templateId)
        if not card_template:
            return

        if card_template.type == 'GAIN_FUNDS':
            apply_gain_funds(player)
        elif card_template.type == 'ACQUIRE':
            apply_acquire(player, opponent)
        elif card_template.type == 'DEFEND':
            apply_defend(player)
        elif card_template.type == 'FRAUD':
            apply_fraud(player, opponent)

    def _resolve_actions(self, state: GameState, player1_action: Optional[Action], player2_action: Optional[Action]) -> List[ResolvedAction]:
        state.phase = 'RESOLUTION'
        resolved = []

        player1 = next((p for p in state.players if p.playerId == player1_action.playerId), None) if player1_action else None
        player2 = next((p for p in state.players if p.playerId == player2_action.playerId), None) if player2_action else None

        def get_card_info(player: Optional[PlayerState], action: Optional[Action]):
            if not player or not action:
                return None, None
            card = next((c for c in player.hand if c.id == action.cardId), None)
            template = self.get_card_template(card.templateId) if card else None
            return card, template

        p1_card, p1_template = get_card_info(player1, player1_action)
        p2_card, p2_template = get_card_info(player2, player2_action)

        p1_played = p1_card and p1_template and player1 and player1.funds >= p1_template.cost
        p2_played = p2_card and p2_template and player2 and player2.funds >= p2_template.cost

        if p1_played:
            player1.funds -= p1_template.cost
            player1.hand = [c for c in player1.hand if c.id != p1_card.id]
            player1.discard.append(p1_card)
            resolved.append(ResolvedAction(playerId=player1.playerId, cardTemplateId=p1_template.templateId))
            state.log.append(f"プレイヤーは「{p1_template.name}」をプレイした")

        if p2_played:
            player2.funds -= p2_template.cost
            player2.hand = [c for c in player2.hand if c.id != p2_card.id]
            player2.discard.append(p2_card)
            resolved.append(ResolvedAction(playerId=player2.playerId, cardTemplateId=p2_template.templateId))
            state.log.append(f"対戦相手は「{p2_template.name}」をプレイした")

        p1_effective_template = p1_template if p1_played else None
        p2_effective_template = p2_template if p2_played else None

        is_p1_acquire = p1_effective_template and p1_effective_template.type == 'ACQUIRE'
        is_p2_acquire = p2_effective_template and p2_effective_template.type == 'ACQUIRE'
        is_p1_defend = p1_effective_template and p1_effective_template.type == 'DEFEND'
        is_p2_defend = p2_effective_template and p2_effective_template.type == 'DEFEND'
        is_p1_fraud = p1_effective_template and p1_effective_template.type == 'FRAUD'
        is_p2_fraud = p2_effective_template and p2_effective_template.type == 'FRAUD'

        p1_effect = bool(p1_played)
        p2_effect = bool(p2_played)

        if is_p1_acquire and is_p2_acquire:
            p1_effect = p2_effect = False
        elif is_p1_acquire and is_p2_defend:
            p1_effect = False
        elif is_p1_acquire and is_p2_fraud:
            p1_effect = False
            opponent_of_p2 = next(p for p in state.players if p.playerId != player2.playerId)
            self._apply_card_effect(state, player2, p2_card, opponent_of_p2)
        elif is_p2_acquire and is_p1_defend:
            p2_effect = False
        elif is_p2_acquire and is_p1_fraud:
            p2_effect = False
            opponent_of_p1 = next(p for p in state.players if p.playerId != player1.playerId)
            self._apply_card_effect(state, player1, p1_card, opponent_of_p1)

        if p1_effect and p1_effective_template and p1_effective_template.type not in ['FRAUD', 'DEFEND']:
            opponent_of_p1 = next(p for p in state.players if p.playerId != player1.playerId)
            self._apply_card_effect(state, player1, p1_card, opponent_of_p1)
        
        if p2_effect and p2_effective_template and p2_effective_template.type not in ['FRAUD', 'DEFEND']:
            opponent_of_p2 = next(p for p in state.players if p.playerId != player2.playerId)
            self._apply_card_effect(state, player2, p2_card, opponent_of_p2)

        return resolved

    def _check_win_condition(self, state: GameState) -> None:
        p1_lost = state.players[0].properties <= 0
        p2_lost = state.players[1].properties <= 0

        if p1_lost or p2_lost:
            state.phase = 'GAME_OVER'
            print('ゲーム終了')