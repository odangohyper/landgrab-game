from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 作成した deck_endpoints と既存の game_endpoints をインポート
from .api import game_endpoints, deck_endpoints
# Firebase Admin SDKはdatabaseモジュールのインポート時に自動的に初期化されます

app = FastAPI(
    title="Landgrab Game API",
    description="API for the Landgrab game backend.",
    version="0.1.0",
)

# CORS設定
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# APIルーターを登録
app.include_router(game_endpoints.router, prefix="/api/v1/game", tags=["Game Logic"])
app.include_router(deck_endpoints.router, prefix="/api/v1", tags=["Decks"]) # deck_endpoints を登録

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Landgrab Game API"}
