# packages/api-server/app/main.py

from fastapi import FastAPI

app = FastAPI(
    title="Landgrab Game API",
    description="API for the Landgrab game backend.",
    version="0.1.0",
)

@app.get("/")
async def read_root():
    return {"message": "Welcome to Landgrab Game API!"}

# Future: Include routers from app/api/endpoints.py
from .api import endpoints
from .api import game_endpoints

app.include_router(endpoints.router, prefix="/api/v1", tags=["decks"])
app.include_router(game_endpoints.router, prefix="/api/v1", tags=["game"])
