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
# from app.api import endpoints
# app.include_router(endpoints.router)
