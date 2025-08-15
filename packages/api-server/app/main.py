# packages/api-server/app/main.py

# FastAPIフレームワークのメインクラスをインポートします。
# これがWebアプリケーションの核となります。
from fastapi import FastAPI

# FastAPIアプリケーションのインスタンスを作成します。
# ここでアプリケーションのメタデータ（タイトル、説明、バージョン）を設定します。
app = FastAPI(
    title="Landgrab Game API", # APIのタイトル。Swagger UIなどに表示されます。
    description="API for the Landgrab game backend.", # APIの説明。Swagger UIなどに表示されます。
    version="0.1.0", # APIのバージョン番号。
)

# ルートURL ("/") へのGETリクエストを処理するエンドポイントを定義します。
# 非同期関数として定義されており、リクエストが来たら実行されます。
@app.get("/")
async def read_root():
    # クライアントにJSON形式のメッセージを返します。
    return {"message": "Welcome to Landgrab Game API!"}

# 今後、`app/api/endpoints.py` および `app/api/game_endpoints.py` からルーターをインクルードする予定です。
# 他のファイルで定義されたルーティング（エンドポイントのグループ）をこのメインアプリケーションに追加します。
from .api import endpoints # デッキ関連のエンドポイントを含むモジュールをインポート
from .api import game_endpoints # ゲームロジック関連のエンドポイントを含むモジュールをインポート

# `endpoints.router` をアプリケーションに含めます。
# `prefix="/api/v1"` により、このルーターの全エンドポイントの前に`/api/v1`が付きます。
# `tags=["decks"]` により、Swagger UIなどで「decks」カテゴリとしてグループ化されます。
app.include_router(endpoints.router, prefix="/api/v1", tags=["decks"])
# `game_endpoints.router` をアプリケーションに含めます。
# 同様に、`prefix="/api/v1"` と `tags=["game"]` が適用されます。
app.include_router(game_endpoints.router, prefix="/api/v1", tags=["game"])
