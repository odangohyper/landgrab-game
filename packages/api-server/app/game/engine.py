# packages\api-server\app\game\engine.py
# randomモジュールをインポートします。デッキのシャッフルなどに使用されます。
import random
# timeモジュールをインポートします。試合IDの生成などに使用されます。
import time
# 型ヒントのために、Pythonのtypingモジュールから必要な型をインポートします。
from typing import Dict, List, Optional

# ゲームのカード効果を適用するためのヘルパー関数群をインポートします。
# これらは、カードの種類に応じてプレイヤーの状態を変更するロジックを含んでいます。
from app.game.cards import (apply_acquire, apply_defend, apply_fraud,
                            apply_gain_funds)
# ゲームの異なるエンティティ（アクション、カード、ゲーム状態、プレイヤー状態など）
# のデータ構造を定義するモデルをインポートします。
from app.game.models import (Action, Card, CardTemplate, GameState,
                             PlayerState, ResolvedAction)

# GameEngineクラスは、ゲームのロジックと状態管理を担当します。
class GameEngine:
    # コンストラクタ: ゲームの初期状態とカードテンプレートのマップを受け取ります。
    def __init__(self, initial_state: GameState, card_templates: Dict[str, CardTemplate]):
        # PythonのPydanticモデルは、初期化を内部で処理するため、
        # ここで追加の「ハイドレーション」（データ変換）は不要です。
        self.state = initial_state
        self.card_templates = card_templates

    # 現在のゲーム状態のディープコピーを返します。
    # 外部からの状態の不意な変更を防ぐためにコピーを返します。
    def get_state(self) -> GameState:
        return self.state.model_copy(deep=True)

    # プレイヤー1とプレイヤー2のアクションを適用し、新しいゲーム状態を返します。
    def apply_action(self, player1_action: Optional[Action], player2_action: Optional[Action]) -> GameState:
        # ゲームが終了している場合、現在の状態をそのまま返します。
        if self.state.phase == 'GAME_OVER':
            return self.get_state()

        # 現在の状態のコピーを作成し、この新しい状態に変更を適用します。
        new_state = self.get_state()
        
        # プレイヤーのアクションを解決し、その結果をリストとして取得します。
        resolved_actions = self._resolve_actions(new_state, player1_action, player2_action)
        # 解決されたアクションのリストを新しい状態に記録します。
        new_state.lastActions = resolved_actions
        
        # 勝利条件が満たされているかを確認し、必要であればゲームを終了状態に設定します。
        self._check_win_condition(new_state)
        
        # 変更された新しい状態をエンジンの現在の状態として設定します。
        self.state = new_state
        # 更新されたゲーム状態のコピーを返します。
        return self.get_state()

    # ターンを進めます。ドローフェーズとアクションフェーズの準備が含まれます。
    def advance_turn(self) -> GameState:
        # ゲームが終了している場合、現在の状態をそのまま返します。
        if self.state.phase == 'GAME_OVER':
            return self.get_state()

        # ターン数をインクリメントします。
        self.state.turn += 1
        # フェーズを「DRAW」（ドローフェーズ）に設定します。
        self.state.phase = 'DRAW'
        # 前のターンのアクション記録をクリアします。
        self.state.lastActions = []
        # ゲームログに新しいターンの開始を記録します。
        self.state.log.append(f"--- ターン {self.state.turn} ---")

        # 各プレイヤーに対してカードをドローする処理を実行します。
        for player in self.state.players:
            # 手札が3枚になるように必要なカードの枚数を計算します。
            cards_to_draw = 3 - len(player.hand)
            if cards_to_draw > 0:
                # 必要な枚数だけカードをドローします。
                self._draw_cards(player, cards_to_draw)
        
        # ドローフェーズが完了したら、フェーズを「ACTION」（アクションフェーズ）に設定します。
        self.state.phase = 'ACTION'
        # 更新されたゲーム状態のコピーを返します。
        return self.get_state()

    # 指定されたテンプレートIDに対応するカードテンプレートを取得します。
    def get_card_template(self, template_id: str) -> Optional[CardTemplate]:
        # `card_templates`辞書からテンプレートを取得し、見つからない場合はNoneを返します。
        return self.card_templates.get(template_id)

    # ゲームの初期状態を静的メソッドとして作成します。
    # インスタンスを生成せずに呼び出すことができます。
    @staticmethod
    def create_initial_state(player1_id: str, player2_id: str, card_templates: Dict[str, CardTemplate]) -> GameState:
        initial_deck = []
        # 全てのカードテンプレートを反復処理して初期デッキを構築します。
        for t in card_templates.values():
            # 「資金集め」カードは4枚、それ以外は2枚というルールでデッキに追加します。
            count = 4 if t.name == '資金集め' else 2
            for _ in range(count):
                initial_deck.append(t.templateId)

        # プレイヤーの状態を生成するためのネストされたヘルパー関数です。
        def create_player(p_id: str) -> PlayerState:
            # 初期デッキのテンプレートIDに基づいてCardオブジェクトのリストを作成します。
            # 各カードにはユニークなIDが付与されます。
            deck_cards = [Card(id=f"card{i}_{tid}", templateId=tid) for i, tid in enumerate(initial_deck)]
            # デッキのカードをシャッフルします。
            random.shuffle(deck_cards)
            # PlayerStateオブジェクトを生成し、初期資金と資産、シャッフルされたデッキを設定します。
            return PlayerState(
                playerId=p_id,
                funds=2,
                properties=1,
                deck=deck_cards
            )

        # GameStateオブジェクトを生成し、初期設定を行います。
        return GameState(
            matchId=f"match-{int(time.time())}", # 現在のタイムスタンプに基づいたユニークな試合ID
            turn=0, # 初期ターンは0
            players=[create_player(player1_id), create_player(player2_id)], # 2人のプレイヤーを作成
            phase='DRAW', # 最初のフェーズは「DRAW」
            log=['ゲーム開始！'] # 初期ログメッセージ
        )

    # プレイヤーにカードをドローさせるプライベートヘルパーメソッドです。
    def _draw_cards(self, player: PlayerState, count: int) -> None:
        # 指定された枚数だけカードをドローします。
        for _ in range(count):
            # デッキが空の場合
            if not player.deck:
                # 捨て札も空であれば、これ以上ドローできないためループを抜けます。
                if not player.discard:
                    break
                # 捨て札をデッキに移動させ、捨て札を空にしてからデッキをシャッフルします。
                player.deck = player.discard
                player.discard = []
                random.shuffle(player.deck)
            
            # デッキの一番上のカード（最初の要素）を引きます。
            drawn_card = player.deck.pop(0)
            # 引いたカードを手札に追加します。
            player.hand.append(drawn_card)

    # カードの効果を適用するプライベートヘルパーメソッドです。
    def _apply_card_effect(self, state: GameState, player: PlayerState, card: Card, opponent: PlayerState) -> None:
        # カードのテンプレート情報を取得します。
        card_template = self.get_card_template(card.templateId)
        # テンプレートが見つからない場合は処理を終了します。
        if not card_template:
            return

        # カードのタイプに応じて、対応する効果適用関数を呼び出します。
        if card_template.type == 'GAIN_FUNDS':
            apply_gain_funds(player) # 資金獲得効果
        elif card_template.type == 'ACQUIRE':
            apply_acquire(player, opponent) # 買収効果
        elif card_template.type == 'DEFEND':
            apply_defend(player) # 防衛効果
        elif card_template.type == 'FRAUD':
            apply_fraud(player, opponent) # 詐欺効果

    # プレイヤーのアクションを解決し、その結果のリストを返すプライベートメソッドです。
    def _resolve_actions(self, state: GameState, player1_action: Optional[Action], player2_action: Optional[Action]) -> List[ResolvedAction]:
        # フェーズを「RESOLUTION」（解決フェーズ）に設定します。
        state.phase = 'RESOLUTION'
        # 解決されたアクションを格納するリストを初期化します。
        resolved = []

        # プレイヤー1とプレイヤー2のPlayerStateオブジェクトを取得します。
        # アクションが提供されていない場合はNoneになります。
        player1 = next((p for p in state.players if p.playerId == player1_action.playerId), None) if player1_action else None
        player2 = next((p for p in state.players if p.playerId == player2_action.playerId), None) if player2_action else None

        # プレイヤーとアクションに基づいてカードとテンプレート情報を取得するヘルパー関数です。
        def get_card_info(player: Optional[PlayerState], action: Optional[Action]):
            if not player or not action:
                return None, None
            # 手札からアクションIDに対応するカードを見つけます。
            card = next((c for c in player.hand if c.id == action.cardId), None)
            # カードが見つかれば、そのテンプレート情報を取得します。
            template = self.get_card_template(card.templateId) if card else None
            return card, template

        # 各プレイヤーのカードとテンプレート情報を取得します。
        p1_card, p1_template = get_card_info(player1, player1_action)
        p2_card, p2_template = get_card_info(player2, player2_action)

        # プレイヤー1がカードをプレイしたかどうかの条件をチェックします。
        # カードが存在し、テンプレートが存在し、プレイヤーが存在し、かつ資金がコスト以上であること。
        p1_played = p1_card and p1_template and player1 and player1.funds >= p1_template.cost
        # プレイヤー2がカードをプレイしたかどうかの条件をチェックします。
        p2_played = p2_card and p2_template and player2 and player2.funds >= p2_template.cost

        # プレイヤー1がカードをプレイした場合の処理
        if p1_played:
            player1.funds -= p1_template.cost # 資金を消費
            player1.hand = [c for c in player1.hand if c.id != p1_card.id] # 手札からカードを削除
            player1.discard.append(p1_card) # 捨て札にカードを追加
            resolved.append(ResolvedAction(playerId=player1.playerId, cardTemplateId=p1_template.templateId)) # 解決済みアクションとして記録
            state.log.append(f"プレイヤーは「{p1_template.name}」をプレイした") # ログに記録

        # プレイヤー2がカードをプレイした場合の処理（プレイヤー1と同様）
        if p2_played:
            player2.funds -= p2_template.cost
            player2.hand = [c for c in player2.hand if c.id != p2_card.id]
            player2.discard.append(p2_card)
            resolved.append(ResolvedAction(playerId=player2.playerId, cardTemplateId=p2_template.templateId))
            state.log.append(f"対戦相手は「{p2_template.name}」をプレイした")

        # 各プレイヤーが実際に有効なカードをプレイしたかどうかを示す変数です。
        p1_effective_template = p1_template if p1_played else None
        p2_effective_template = p2_template if p2_played else None

        # 各プレイヤーが特定のアクションタイプをプレイしたかどうかのフラグを設定します。
        is_p1_acquire = p1_effective_template and p1_effective_template.type == 'ACQUIRE'
        is_p2_acquire = p2_effective_template and p2_effective_template.type == 'ACQUIRE'
        is_p1_defend = p1_effective_template and p1_effective_template.type == 'DEFEND'
        is_p2_defend = p2_effective_template and p2_effective_template.type == 'DEFEND'
        is_p1_fraud = p1_effective_template and p1_effective_template.type == 'FRAUD'
        is_p2_fraud = p2_effective_template and p2_effective_template.type == 'FRAUD'

        # 各プレイヤーのアクションが最終的に効果を発揮するかどうかのフラグを初期化します。
        p1_effect = bool(p1_played)
        p2_effect = bool(p2_played)

        # カードの相殺ロジック
        # プレイヤー1が「買収」とプレイヤー2が「買収」の場合、両方のアクションは無効になります。
        if is_p1_acquire and is_p2_acquire:
            p1_effect = p2_effect = False
        # プレイヤー1が「買収」とプレイヤー2が「防衛」の場合、プレイヤー1の「買収」は無効になります。
        elif is_p1_acquire and is_p2_defend:
            p1_effect = False
        # プレイヤー1が「買収」とプレイヤー2が「詐欺」の場合、プレイヤー1の「買収」は無効になり、
        # プレイヤー2の「詐欺」が適用されます。
        elif is_p1_acquire and is_p2_fraud:
            p1_effect = False
            # プレイヤー2の対戦相手を取得します。
            opponent_of_p2 = next(p for p in state.players if p.playerId != player2.playerId)
            # プレイヤー2のカード効果を適用します。
            self._apply_card_effect(state, player2, p2_card, opponent_of_p2)
        # プレイヤー2が「買収」とプレイヤー1が「防衛」の場合、プレイヤー2の「買収」は無効になります。
        elif is_p2_acquire and is_p1_defend:
            p2_effect = False
        # プレイヤー2が「買収」とプレイヤー1が「詐欺」の場合、プレイヤー2の「買収」は無効になり、
        # プレイヤー1の「詐欺」が適用されます。
        elif is_p2_acquire and is_p1_fraud:
            p2_effect = False
            # プレイヤー1の対戦相手を取得します。
            opponent_of_p1 = next(p for p in state.players if p.playerId != player1.playerId)
            # プレイヤー1のカード効果を適用します。
            self._apply_card_effect(state, player1, p1_card, opponent_of_p1)

        # プレイヤー1のカード効果が有効で、かつそのカードが「詐欺」でも「防衛」でもない場合、効果を適用します。
        # （「詐欺」と「防衛」は上記の相殺ロジックで既に処理されているか、特殊な効果を持つためここで除外されます）
        if p1_effect and p1_effective_template and p1_effective_template.type not in ['FRAUD', 'DEFEND']:
            # プレイヤー1の対戦相手を取得します。
            opponent_of_p1 = next(p for p in state.players if p.playerId != player1.playerId)
            # プレイヤー1のカード効果を適用します。
            self._apply_card_effect(state, player1, p1_card, opponent_of_p1)
        
        # プレイヤー2のカード効果が有効で、かつそのカードが「詐欺」でも「防衛」でもない場合、効果を適用します。
        if p2_effect and p2_effective_template and p2_effective_template.type not in ['FRAUD', 'DEFEND']:
            # プレイヤー2の対戦相手を取得します。
            opponent_of_p2 = next(p for p in state.players if p.playerId != player2.playerId)
            # プレイヤー2のカード効果を適用します。
            self._apply_card_effect(state, player2, p2_card, opponent_of_p2)

        # 解決されたアクションのリストを返します。
        return resolved

    # 勝利条件が満たされているかを確認するプライベートメソッドです。
    def _check_win_condition(self, state: GameState) -> None:
        # プレイヤー1が資産を全て失ったか（0以下になったか）をチェックします。
        p1_lost = state.players[0].properties <= 0
        # プレイヤー2が資産を全て失ったか（0以下になったか）をチェックします。
        p2_lost = state.players[1].properties <= 0

        # いずれかのプレイヤーが資産を全て失った場合
        if p1_lost or p2_lost:
            # ゲームのフェーズを「GAME_OVER」に設定します。
            state.phase = 'GAME_OVER'
            # コンソールにゲーム終了メッセージを出力します。
            print('ゲーム終了')
