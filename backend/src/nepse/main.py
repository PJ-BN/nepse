from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nepse.presentation.api import health

app = FastAPI(title="NEPSE Analytics API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])
app.include_router(health.router)
