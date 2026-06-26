from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.config import router as config_router
from app.api.routes.health import router as health_router
from app.api.routes.materials import router as materials_router
from app.api.routes.projects import router as projects_router

app = FastAPI(
    title="mcAgentBuilder Backend",
    version="0.1.0",
    description="Constraint-first Minecraft blueprint backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:9393", "http://127.0.0.1:9393"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(materials_router)
app.include_router(projects_router)
app.include_router(config_router)
