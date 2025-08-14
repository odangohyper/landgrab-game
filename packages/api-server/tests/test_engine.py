# packages/api-server/tests/test_engine.py
import pytest
from app.game.engine import GameEngine
from app.game.models import GameState, PlayerState, Action, Card, CardTemplate

# Mock card templates for testing
@pytest.fixture
def mock_card_templates():
    return {
        'GAIN_FUNDS': CardTemplate(templateId='GAIN_FUNDS', name='資金集め', cost=0, type='GAIN_FUNDS'),
        'ACQUIRE': CardTemplate(templateId='ACQUIRE', name='買収', cost=2, type='ACQUIRE'),
        'DEFEND': CardTemplate(templateId='DEFEND', name='防衛', cost=0, type='DEFEND'),
        'FRAUD': CardTemplate(templateId='FRAUD', name='詐欺', cost=1, type='FRAUD'),
    }

# Fixture to set up a new engine for each test
@pytest.fixture
def game_engine(mock_card_templates):
    initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
    engine = GameEngine(initial_state, mock_card_templates)
    return engine

def test_create_initial_state_correctly(game_engine):
    state = game_engine.get_state()
    assert state.matchId is not None
    assert state.turn == 0
    assert state.phase == 'DRAW'
    assert len(state.players) == 2

    player1 = next(p for p in state.players if p.playerId == 'player1-id')
    player2 = next(p for p in state.players if p.playerId == 'player2-id')

    assert player1 is not None
    assert player1.funds == 2
    assert player1.properties == 1
    assert len(player1.deck) > 0

    assert player2 is not None
    assert player2.funds == 2
    assert player2.properties == 1
    assert len(player2.deck) > 0

def test_advance_turn_and_draw_cards(game_engine):
    player1 = game_engine.get_state().players[0]
    player1.hand = []
    new_state = game_engine.advance_turn()
    assert new_state.turn == 1
    assert new_state.phase == 'ACTION'
    updated_player1 = new_state.players[0]
    assert len(updated_player1.hand) == 3

def test_reshuffle_discard_pile_into_deck(game_engine):
    state = game_engine.get_state()
    player1 = state.players[0]
    player1.hand = []
    player1.discard = list(player1.deck)
    player1.deck = []
    
    test_engine = GameEngine(state, game_engine.card_templates)
    new_state = test_engine.advance_turn()
    
    updated_player1 = new_state.players[0]
    assert len(updated_player1.deck) > 0
    assert len(updated_player1.discard) == 0
    assert len(updated_player1.hand) == 3

class TestActionResolution:
    def test_resolve_acquire_vs_gain_funds(self, mock_card_templates):
        initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
        player1 = initial_state.players[0]
        player1.hand = [Card(id='p1card', templateId='ACQUIRE')]
        player1.funds = 3
        player2 = initial_state.players[1]
        player2.hand = [Card(id='p2card', templateId='GAIN_FUNDS')]
        player2.funds = 1

        test_engine = GameEngine(initial_state, mock_card_templates)
        p1_action = Action(playerId='player1-id', cardId='p1card')
        p2_action = Action(playerId='player2-id', cardId='p2card')
        new_state = test_engine.apply_action(p1_action, p2_action)

        new_player1 = new_state.players[0]
        new_player2 = new_state.players[1]

        assert new_player1.funds == 1
        assert new_player1.properties == 2
        assert new_player2.funds == 3
        assert new_player2.properties == 0
        assert 'プレイヤーは「買収」をプレイした' in new_state.log
        assert '対戦相手は「資金集め」をプレイした' in new_state.log

    def test_nullify_acquire_vs_acquire(self, mock_card_templates):
        initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
        player1 = initial_state.players[0]
        player1.hand = [Card(id='p1card', templateId='ACQUIRE')]
        player1.funds = 2
        player2 = initial_state.players[1]
        player2.hand = [Card(id='p2card', templateId='ACQUIRE')]
        player2.funds = 2

        test_engine = GameEngine(initial_state, mock_card_templates)
        p1_action = Action(playerId='player1-id', cardId='p1card')
        p2_action = Action(playerId='player2-id', cardId='p2card')
        new_state = test_engine.apply_action(p1_action, p2_action)

        assert new_state.players[0].properties == 1
        assert new_state.players[1].properties == 1

    def test_nullify_acquire_with_defend(self, mock_card_templates):
        initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
        player1 = initial_state.players[0]
        player1.hand = [Card(id='p1card', templateId='ACQUIRE')]
        player1.funds = 2
        player2 = initial_state.players[1]
        player2.hand = [Card(id='p2card', templateId='DEFEND')]
        player2.funds = 0

        test_engine = GameEngine(initial_state, mock_card_templates)
        p1_action = Action(playerId='player1-id', cardId='p1card')
        p2_action = Action(playerId='player2-id', cardId='p2card')
        new_state = test_engine.apply_action(p1_action, p2_action)

        assert new_state.players[0].properties == 1
        assert new_state.players[1].properties == 1

    def test_nullify_acquire_with_fraud(self, mock_card_templates):
        initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
        player1 = initial_state.players[0]
        player1.hand = [Card(id='p1card', templateId='ACQUIRE')]
        player1.funds = 2
        player2 = initial_state.players[1]
        player2.hand = [Card(id='p2card', templateId='FRAUD')]
        player2.funds = 1

        test_engine = GameEngine(initial_state, mock_card_templates)
        p1_action = Action(playerId='player1-id', cardId='p1card')
        p2_action = Action(playerId='player2-id', cardId='p2card')
        new_state = test_engine.apply_action(p1_action, p2_action)

        assert new_state.players[0].properties == 0
        assert new_state.players[1].properties == 2

    def test_cannot_afford_card(self, mock_card_templates):
        initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
        player1 = initial_state.players[0]
        player1.hand = [Card(id='p1card', templateId='ACQUIRE')]
        player1.funds = 1
        player2 = initial_state.players[1]
        player2.hand = [Card(id='p2card', templateId='GAIN_FUNDS')]
        player2.funds = 1

        test_engine = GameEngine(initial_state, mock_card_templates)
        p1_action = Action(playerId='player1-id', cardId='p1card')
        p2_action = Action(playerId='player2-id', cardId='p2card')
        new_state = test_engine.apply_action(p1_action, p2_action)

        assert new_state.players[0].properties == 1
        assert new_state.players[1].properties == 1
        assert new_state.players[1].funds == 3
        assert 'プレイヤーは「買収」をプレイした' not in new_state.log
        assert '対戦相手は「資金集め」をプレイした' in new_state.log

def test_end_game_on_zero_properties(mock_card_templates):
    initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
    player1 = initial_state.players[0]
    player1.hand = [Card(id='p1card', templateId='ACQUIRE')]
    player1.funds = 2
    player2 = initial_state.players[1]
    player2.hand = []
    player2.properties = 1

    test_engine = GameEngine(initial_state, mock_card_templates)
    p1_action = Action(playerId='player1-id', cardId='p1card')
    new_state = test_engine.apply_action(p1_action, None)

    assert new_state.phase == 'GAME_OVER'
