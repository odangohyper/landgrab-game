# packages/api-server/tests/test_engine.py

# pytestフレームワークをインポートします。これはPythonでテストを書くための一般的なツールです。
import pytest
# テスト対象となるGameEngineクラスをインポートします。
from app.game.engine import GameEngine
# ゲームの異なるエンティティ（ゲーム状態、プレイヤー状態、アクション、カード、カードテンプレート）
# のデータ構造を定義するモデルをインポートします。
from app.game.models import GameState, PlayerState, Action, Card, CardTemplate

# モック（模擬）のカードテンプレートを定義するためのpytestフィクスチャです。
# 各テストケースで再利用可能な形で、テスト用のカードデータを提供します。
@pytest.fixture
def mock_card_templates():
    return {
        'GAIN_FUNDS': CardTemplate(templateId='GAIN_FUNDS', name='資金集め', cost=0, type='GAIN_FUNDS'),
        'ACQUIRE': CardTemplate(templateId='ACQUIRE', name='買収', cost=2, type='ACQUIRE'),
        'DEFEND': CardTemplate(templateId='DEFEND', name='防衛', cost=0, type='DEFEND'),
        'FRAUD': CardTemplate(templateId='FRAUD', name='詐欺', cost=1, type='FRAUD'),
    }

# 各テストのために新しいGameEngineインスタンスをセットアップするpytestフィクスチャです。
# これにより、各テストが独立したクリーンなエンジン状態から開始されます。
@pytest.fixture
def game_engine(mock_card_templates):
    # GameEngineの静的メソッドを使用して初期ゲーム状態を作成します。
    initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
    # 作成された初期状態とモックカードテンプレートでGameEngineインスタンスを初期化します。
    engine = GameEngine(initial_state, mock_card_templates)
    return engine

# 初期ゲーム状態が正しく作成されることをテストします。
def test_create_initial_state_correctly(game_engine):
    # エンジンから現在のゲーム状態を取得します。
    state = game_engine.get_state()
    # matchIdがNoneではないことを確認します（何らかの値が生成されていること）。
    assert state.matchId is not None
    # ターン数が初期値の0であることを確認します。
    assert state.turn == 0
    # フェーズが「DRAW」で開始されることを確認します。
    assert state.phase == 'DRAW'
    # プレイヤーが2人いることを確認します。
    assert len(state.players) == 2

    # player1-idとplayer2-idを持つプレイヤーを見つけます。
    player1 = next(p for p in state.players if p.playerId == 'player1-id')
    player2 = next(p for p in state.players if p.playerId == 'player2-id')

    # プレイヤー1が存在することを確認し、その初期資金、資産、デッキの枚数を確認します。
    assert player1 is not None
    assert player1.funds == 2
    assert player1.properties == 1
    assert len(player1.deck) > 0 # デッキが空ではないことを確認

    # プレイヤー2についても同様に確認します。
    assert player2 is not None
    assert player2.funds == 2
    assert player2.properties == 1
    assert len(player2.deck) > 0 # デッキが空ではないことを確認

# ターンが進み、カードが正しくドローされることをテストします。
def test_advance_turn_and_draw_cards(game_engine):
    # 最初のプレイヤー（player1）の手札を空にします。
    player1 = game_engine.get_state().players[0]
    player1.hand = []
    # ターンを進めます。これにより、プレイヤーはカードをドローするはずです。
    new_state = game_engine.advance_turn()
    # ターン数が1にインクリメントされていることを確認します。
    assert new_state.turn == 1
    # フェーズが「ACTION」に移行していることを確認します。
    assert new_state.phase == 'ACTION'
    # 更新されたプレイヤー1の状態を取得します。
    updated_player1 = new_state.players[0]
    # プレイヤー1の手札が3枚になっていることを確認します（ドローにより）。
    assert len(updated_player1.hand) == 3

# デッキが空になったときに、捨て札がデッキにシャッフルされることをテストします。
def test_reshuffle_discard_pile_into_deck(game_engine):
    # 現在のゲーム状態を取得します。
    state = game_engine.get_state()
    # プレイヤー1の状態を取得し、手札を空にします。
    player1 = state.players[0]
    player1.hand = []
    # デッキのすべてのカードを捨て札に移動させます。
    player1.discard = list(player1.deck)
    # デッキを空にします。
    player1.deck = []
    
    # 変更された状態とカードテンプレートで新しいGameEngineインスタンスを作成します。
    test_engine = GameEngine(state, game_engine.card_templates)
    # ターンを進めます。このとき、ドローフェーズでデッキが空なのでシャッフルがトリガーされるはずです。
    new_state = test_engine.advance_turn()
    
    # 更新されたプレイヤー1の状態を取得します。
    updated_player1 = new_state.players[0]
    # デッキが空ではなくなっていることを確認します。
    assert len(updated_player1.deck) > 0
    # 捨て札が空になっていることを確認します。
    assert len(updated_player1.discard) == 0
    # 手札が3枚になっていることを確認します。
    assert len(updated_player1.hand) == 3

# アクション解決の様々なシナリオをテストするためのクラスです。
class TestActionResolution:
    # 「買収」と「資金集め」が正しく解決されることをテストします。
    def test_resolve_acquire_vs_gain_funds(self, mock_card_templates):
        # テスト用の初期状態を作成します。
        initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
        # プレイヤー1に「買収」カードを手札に持たせ、資金を3に設定します。
        player1 = initial_state.players[0]
        player1.hand = [Card(id='p1card', templateId='ACQUIRE')]
        player1.funds = 3
        # プレイヤー2に「資金集め」カードを手札に持たせ、資金を1に設定します。
        player2 = initial_state.players[1]
        player2.hand = [Card(id='p2card', templateId='GAIN_FUNDS')]
        player2.funds = 1

        # テスト用のGameEngineインスタンスを作成します。
        test_engine = GameEngine(initial_state, mock_card_templates)
        # プレイヤー1とプレイヤー2のアクションを定義します。
        p1_action = Action(playerId='player1-id', cardId='p1card')
        p2_action = Action(playerId='player2-id', cardId='p2card')
        # アクションを適用し、新しいゲーム状態を取得します。
        new_state = test_engine.apply_action(p1_action, p2_action)

        # 更新されたプレイヤー1とプレイヤー2の状態を取得します。
        new_player1 = new_state.players[0]
        new_player2 = new_state.players[1]

        # プレイヤー1の資金が正しく減少（3 -> 1）し、資産が正しく増加（1 -> 2）したことを確認します。
        assert new_player1.funds == 1
        assert new_player1.properties == 2
        # プレイヤー2の資金が正しく増加（1 -> 3）し、資産が正しく減少（1 -> 0）したことを確認します。
        assert new_player2.funds == 3
        assert new_player2.properties == 0
        # ゲームログに各プレイヤーのプレイしたカードが記録されていることを確認します。
        assert 'プレイヤーは「買収」をプレイした' in new_state.log
        assert '対戦相手は「資金集め」をプレイした' in new_state.log

    # 両プレイヤーが「買収」カードをプレイした場合に、両方のアクションが無効になることをテストします。
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

        # 両プレイヤーの資産が変化していないことを確認します。
        assert new_state.players[0].properties == 1
        assert new_state.players[1].properties == 1

    # 「防衛」カードが「買収」カードを無効にすることをテストします。
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

        # 両プレイヤーの資産が変化していないことを確認します。
        assert new_state.players[0].properties == 1
        assert new_state.players[1].properties == 1

    # 「詐欺」カードが「買収」カードを無効にし、同時に自身の効果を発揮することをテストします。
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

        # プレイヤー1が資産を1つ失い（詐欺の効果）、プレイヤー2が資産を1つ得る（詐欺の効果）ことを確認します。
        # プレイヤー1の「買収」は無効化されています。
        assert new_state.players[0].properties == 0
        assert new_state.players[1].properties == 2

    # プレイヤーがカードのコストを支払えない場合に、そのアクションが実行されないことをテストします。
    def test_cannot_afford_card(self, mock_card_templates):
        initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
        player1 = initial_state.players[0]
        player1.hand = [Card(id='p1card', templateId='ACQUIRE')]
        player1.funds = 1 # 「買収」のコスト2に対して資金が不足
        player2 = initial_state.players[1]
        player2.hand = [Card(id='p2card', templateId='GAIN_FUNDS')]
        player2.funds = 1

        test_engine = GameEngine(initial_state, mock_card_templates)
        p1_action = Action(playerId='player1-id', cardId='p1card')
        p2_action = Action(playerId='player2-id', cardId='p2card')
        new_state = test_engine.apply_action(p1_action, p2_action)

        # プレイヤー1の資産が変化していないことを確認します（「買収」が実行されていないため）。
        assert new_state.players[0].properties == 1
        # プレイヤー2の資産が変化していないことを確認します（「資金集め」は資産に影響しないため）。
        assert new_state.players[1].properties == 1
        # プレイヤー2の資金が正しく増加（1 -> 3）したことを確認します。
        assert new_state.players[1].funds == 3
        # ゲームログにプレイヤー1の「買収」がプレイされたという記録がないことを確認します。
        assert 'プレイヤーは「買収」をプレイした' not in new_state.log
        # ゲームログにプレイヤー2の「資金集め」がプレイされたという記録があることを確認します。
        assert '対戦相手は「資金集め」をプレイした' in new_state.log

# プレイヤーがすべての資産を失ったときにゲームが終了することをテストします。
def test_end_game_on_zero_properties(mock_card_templates):
    initial_state = GameEngine.create_initial_state('player1-id', 'player2-id', mock_card_templates)
    player1 = initial_state.players[0]
    player1.hand = [Card(id='p1card', templateId='ACQUIRE')]
    player1.funds = 2
    player2 = initial_state.players[1]
    player2.hand = [] # プレイヤー2は何もプレイしない
    player2.properties = 1 # プレイヤー2は資産を1つだけ持っている

    test_engine = GameEngine(initial_state, mock_card_templates)
    p1_action = Action(playerId='player1-id', cardId='p1card')
    # プレイヤー1が「買収」を実行し、プレイヤー2は何もアクションしない設定で適用します。
    new_state = test_engine.apply_action(p1_action, None)

    # ゲームのフェーズが「GAME_OVER」になっていることを確認します。
    assert new_state.phase == 'GAME_OVER'
