from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.seed import seed_dev_user_if_needed
from app.db.session import engine
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.debug import router as debug_router
from app.api.audit import router as audit_router
from app.api.bk_reports import router as bk_reports_router
from app.api.restaurants import router as restaurants_router
import os

import app.models

app = FastAPI(title="Projet Restau API", version="0.1.0")

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(debug_router)
app.include_router(audit_router)
app.include_router(bk_reports_router)
app.include_router(restaurants_router)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/db-check")
def db_check():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return {"db": "ok", "result": result.scalar()}

@app.get("/tables")
def tables():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """)).fetchall()
        return {"tables": [r[0] for r in rows]}
    
@app.on_event("startup")
def on_startup():
    seed_dev_user_if_needed()
