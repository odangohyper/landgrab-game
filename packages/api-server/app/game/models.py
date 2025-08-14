# packages/api-server/app/game/models.py

# PydanticライブラリからBaseModelとFieldをインポートします。
# BaseModelはデータモデルを定義するための基底クラスであり、Fieldはモデルのフィールドに
# 追加のメタデータやバリデーション（検証）を設定するために使用されます。
from pydantic import BaseModel, Field
# typingモジュールからリスト型（List）とLiteral型をインポートします。
# Listはリスト（配列）の型ヒントに、Literalは特定の文字列値のみを許容する型ヒントに使用されます。
from typing import List, Literal

# --- ゲームロジックモデル（web-game-client/src/types.ts と同じものを反映） ---
# これらのクラスは、フロントエンド（TypeScript）とバックエンド（Python）間で
# データ構造の整合性を保つために設計されています。

# Cardクラスは、ゲーム内の個々のカードを表します。
class Card(BaseModel):
    id: str # カードの一意の識別子（例: "card1_GAIN_FUNDS"）
    templateId: str # そのカードがどのCardTemplateに基づいているかを示す識別子（例: "GAIN_FUNDS"）

# CardTemplateクラスは、カードの種類とその特性を定義します。
# これは、ゲーム内の各カードの「設計図」のようなものです。
class CardTemplate(BaseModel):
    templateId: str # カードテンプレートの一意の識別子
    name: str # カードの名前（例: "資金集め"）
    cost: int # このカードをプレイするために必要なコスト（資金）
    description: str | None = None # カードの効果の説明（オプション）
    # カードのタイプを定義します。Literalを使うことで、指定された文字列のみを値として許容します。
    # これにより、型の安全性が向上し、入力ミスを防ぐことができます。
    type: Literal['GAIN_FUNDS', 'ACQUIRE', 'DEFEND', 'FRAUD']
    imageFile: str | None = None # カード画像のファイル名（オプション）

# PlayerStateクラスは、ゲーム内の各プレイヤーの現在の状態を表します。
class PlayerState(BaseModel):
    playerId: str # プレイヤーの一意の識別子
    funds: int # プレイヤーが現在持っている資金
    properties: int # プレイヤーが現在所有している資産の数
    # プレイヤーの手札にあるカードのリスト。
    # Field(default_factory=list) を使用することで、デフォルト値が空のリストになり、
    # インスタンスが作成されるたびに新しいリストが生成されます。
    hand: List[Card] = Field(default_factory=list)
    # プレイヤーのデッキにあるカードのリスト。
    deck: List[Card] = Field(default_factory=list)
    # プレイヤーの捨て札にあるカードのリスト。
    discard: List[Card] = Field(default_factory=list)

# Actionクラスは、プレイヤーがゲーム中で行う単一のアクションを表します。
# プレイヤーがどのカードをプレイしたかを示します。
class Action(BaseModel):
    playerId: str # アクションを行ったプレイヤーのID
    cardId: str # プレイされたカードの一意のID

# ResolvedActionクラスは、ターン終了後に解決されたアクションの結果を記録するために使用されます。
# これは、ゲームのログや履歴に表示される情報です。
class ResolvedAction(BaseModel):
    playerId: str # アクションを行ったプレイヤーのID
    cardTemplateId: str # プレイされたカードのテンプレートID

# GameStateクラスは、ゲーム全体の現在の状態を表します。
# ゲームの進行状況に関する全ての主要な情報を含みます。
class GameState(BaseModel):
    matchId: str # 試合の一意の識別子
    turn: int # 現在のターン数
    players: List[PlayerState] # ゲームに参加している全てのプレイヤーの状態のリスト
    # ゲームの現在のフェーズを定義します。Literalで許容されるフェーズを制限します。
    phase: Literal['DRAW', 'ACTION', 'RESOLUTION', 'GAME_OVER']
    # 前のターンに解決されたアクションのリスト。デフォルトは空のリストです。
    lastActions: List[ResolvedAction] = Field(default_factory=list)
    # ゲーム内で発生したイベントのログメッセージのリスト。デフォルトは空のリストです。
    log: List[str] = Field(default_factory=list)
