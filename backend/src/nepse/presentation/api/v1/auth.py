from collections.abc import AsyncIterator
from datetime import timedelta
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic_settings import BaseSettings
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.auth import use_cases
from nepse.application.auth.ports import EmailTaken
from nepse.infrastructure.db.models_portfolio import SqlUserRepo
from nepse.infrastructure.db.session import SessionLocal
from nepse.presentation.api.schemas.auth import LoginIn, RegisterIn, TokenOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class AuthSettings(BaseSettings):
    jwt_secret: str = ""  # env JWT_SECRET; auth endpoints answer 503 until it is set
    jwt_ttl_minutes: int = 12 * 60


@lru_cache
def _settings() -> AuthSettings:
    return AuthSettings()


def jwt_secret() -> str:
    secret = _settings().jwt_secret
    if len(secret) < 32:
        raise HTTPException(503, "JWT_SECRET is not configured (needs >= 32 chars)")
    return secret


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


_bearer = HTTPBearer(auto_error=False)


def current_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer), secret: str = Depends(jwt_secret),
) -> int:
    if creds is None:
        raise HTTPException(401, "not authenticated", headers={"WWW-Authenticate": "Bearer"})
    try:
        return use_cases.user_id_from_token(creds.credentials, secret)
    except use_cases.InvalidToken:
        raise HTTPException(401, "invalid or expired token", headers={"WWW-Authenticate": "Bearer"}) from None


@router.post("/register", status_code=201, response_model=TokenOut)
async def register(
    body: RegisterIn, session: AsyncSession = Depends(get_session), secret: str = Depends(jwt_secret),
) -> TokenOut:
    users = SqlUserRepo(session)
    try:
        await use_cases.register(users, body.email, body.password)
    except EmailTaken:
        raise HTTPException(409, "email already registered") from None
    ttl = timedelta(minutes=_settings().jwt_ttl_minutes)
    return TokenOut(access_token=await use_cases.login(users, body.email, body.password, secret, ttl))


@router.post("/login", response_model=TokenOut)
async def login(
    body: LoginIn, session: AsyncSession = Depends(get_session), secret: str = Depends(jwt_secret),
) -> TokenOut:
    ttl = timedelta(minutes=_settings().jwt_ttl_minutes)
    try:
        return TokenOut(access_token=await use_cases.login(SqlUserRepo(session), body.email, body.password, secret, ttl))
    except use_cases.InvalidCredentials:
        raise HTTPException(401, "invalid email or password") from None
