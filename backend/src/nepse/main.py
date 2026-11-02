from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nepse.presentation.api import health
from nepse.presentation.api.v1 import (
    admin,
    ai,
    auth,
    breadth,
    calendar,
    chart_data,
    company,
    floorsheet,
    macro,
    market,
    mutual_funds,
    nepse_layers,
    news,
    portfolio,
    screener,
    simulation,
    sync,
    udf,
    watchlist,
    ws,
)

from contextlib import asynccontextmanager
import os

cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env else ["*"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure hardcoded admin user from .env is provisioned at startup
    try:
        from nepse.infrastructure.db.session import SessionLocal
        from nepse.infrastructure.db.models_portfolio import SqlUserRepo
        from nepse.application.auth.use_cases import _hasher

        admin_email = os.getenv("ADMIN_EMAIL", "admin@nepse.local").strip().lower()
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@123456").strip()
        if admin_email and admin_password:
            async with SessionLocal() as session:
                users = SqlUserRepo(session)
                existing = await users.get_by_email(admin_email)
                if not existing:
                    await users.add(admin_email, _hasher.hash(admin_password), role="admin")
                else:
                    if existing.role != "admin":
                        await users.update_role(existing.id, "admin")
                    if not existing.is_active:
                        await users.update_status(existing.id, True)
                    await users.update_password(existing.id, _hasher.hash(admin_password))
    except Exception:
        pass
    yield


app = FastAPI(title="NEPSE Analytics API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(auth.router)
app.include_router(breadth.router)
app.include_router(calendar.router)
app.include_router(chart_data.router)
app.include_router(company.router)
app.include_router(floorsheet.router)
app.include_router(macro.router)
app.include_router(market.router)
app.include_router(news.router)
app.include_router(portfolio.router)
app.include_router(screener.router)
app.include_router(simulation.router)
app.include_router(sync.router)
app.include_router(watchlist.router)
app.include_router(mutual_funds.router)
app.include_router(nepse_layers.router)
app.include_router(udf.router)
app.include_router(ws.router)
