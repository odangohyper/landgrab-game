# packages/api-server/app/api/endpoints.py

# FastAPIフレームワークからAPIRouterとHTTPExceptionをインポートします。
# APIRouterはルーティングをモジュール化するために使用され、
# HTTPExceptionはHTTPエラーレスポンスを返すために使用されます。
from fastapi import APIRouter, HTTPException
# 型ヒントのために、PythonのtypingモジュールからDict型をインポートします。
from typing import Dict
# UUID（Universally Unique Identifier）を生成するためにuuidモジュールをインポートします。
import uuid

# アプリケーションのゲームモデルからDeckモデルをインポートします。
# DeckはPydantic BaseModelで定義されたデータ構造です。
from ..game.models import Deck
# データベース接続を取得するための関数をインポートします。
from ..db.database import get_db

# APIRouterのインスタンスを作成します。
# これにより、関連するエンドポイントをグループ化できます。
router = APIRouter()

# デッキを作成するためのPOSTエンドポイントを定義します。
# URLは`/decks/`で、リクエストボディとしてDeckモデルを受け取ります。
# レスポンスモデルもDeckとして指定されており、APIドキュメントが自動生成されます。
@router.post("/decks/", response_model=Deck)
async def create_deck(deck: Deck):
    # データベースの参照を取得します。
    db = get_db()
    # 'decks'パスのデータベース参照を取得します。
    ref = db.reference('decks')
    
    # デッキのIDが提供されていない場合、新しいUUIDを割り当てます。
    if not deck.id:
        deck.id = str(uuid.uuid4()) # ユニークなUUIDを文字列として生成し、IDとして設定
    
    # デッキデータをデータベースに設定します。
    # `deck.model_dump()`はPydanticモデルのデータを辞書形式に変換します。
    ref.child(deck.id).set(deck.model_dump())
    # 作成または更新されたデッキをレスポンスとして返します。
    return deck

# 特定のデッキを取得するためのGETエンドポイントを定義します。
# URLは`/decks/{deck_id}`で、パスパラメータとして`deck_id`を受け取ります。
# レスポンスモデルはDeckとして指定されています。
@router.get("/decks/{deck_id}", response_model=Deck)
async def get_deck(deck_id: str):
    # データベースの参照を取得します。
    db = get_db()
    # 指定された`deck_id`に対応するデータベース参照を取得します。
    ref = db.reference(f'decks/{deck_id}')
    # データベースからデッキデータを取得します。
    deck_data = ref.get()
    
    # デッキデータが見つからない場合、404 Not Foundエラーを返します。
    if not deck_data:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # 取得した辞書データをDeckモデルに変換して返します。
    return Deck(**deck_data)

# 特定のデッキを更新するためのPUTエンドポイントを定義します。
# URLは`/decks/{deck_id}`で、パスパラメータとリクエストボディとしてDeckモデルを受け取ります。
# レスポンスモデルはDeckとして指定されています。
@router.put("/decks/{deck_id}", response_model=Deck)
async def update_deck(deck_id: str, deck: Deck):
    # データベースの参照を取得します。
    db = get_db()
    # 指定された`deck_id`に対応するデータベース参照を取得します。
    ref = db.reference(f'decks/{deck_id}')
    
    # デッキが存在するかどうかを確認します。
    existing_deck = ref.get()
    if not existing_deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # パスパラメータのIDとリクエストボディのIDが一致することを確認します。
    # 一致しない場合、400 Bad Requestエラーを返します。
    if deck_id != deck.id:
        raise HTTPException(status_code=400, detail="Deck ID in path does not match ID in request body")

    # データベースのデッキデータを更新します。
    ref.set(deck.model_dump())
    # 更新されたデッキをレスポンスとして返します。
    return deck
