from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nepse.presentation.api import health
from nepse.presentation.api.v1 import auth, breadth, company, floorsheet, macro, market, mutual_funds, portfolio, screener, udf, ws

app = FastAPI(title="NEPSE Analytics API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(breadth.router)
app.include_router(company.router)
app.include_router(floorsheet.router)
app.include_router(macro.router)
app.include_router(market.router)
app.include_router(portfolio.router)
app.include_router(screener.router)
app.include_router(mutual_funds.router)
app.include_router(udf.router)
app.include_router(ws.router)
