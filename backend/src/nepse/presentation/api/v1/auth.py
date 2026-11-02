from collections.abc import AsyncIterator
from datetime import timedelta
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic_settings import BaseSettings
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.auth import use_cases
from nepse.application.auth.ports import EmailTaken, User
from nepse.infrastructure.db.models_portfolio import SqlUserRepo
from nepse.infrastructure.db.session import SessionLocal
from nepse.presentation.api.schemas.auth import LoginIn, RegisterIn, TokenOut, UserOut

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


async def require_admin(
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> User:
    users = SqlUserRepo(session)
    user = await users.get_by_id(user_id)
    if user is None:
        raise HTTPException(404, "user not found")
    if not user.is_active:
        raise HTTPException(403, "account is deactivated")
    if user.role != "admin":
        raise HTTPException(403, "administrative privileges required")
    return user


@router.get("/me", response_model=UserOut)
async def me(
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    users = SqlUserRepo(session)
    user = await users.get_by_id(user_id)
    if user is None:
        raise HTTPException(404, "user not found")
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


@router.post("/register", status_code=201, response_model=TokenOut)
async def register(
    body: RegisterIn, session: AsyncSession = Depends(get_session), secret: str = Depends(jwt_secret),
) -> TokenOut:
    users = SqlUserRepo(session)
    try:
        # Check if first user or matches ADMIN_INITIAL_EMAIL
        import os
        admin_email = os.getenv("ADMIN_INITIAL_EMAIL", "").strip().lower()
        role = "admin" if (admin_email and body.email.strip().lower() == admin_email) else "user"
        
        # Also, if total users is 0, make first user admin automatically
        all_users, total = await users.list_users(limit=1)
        if total == 0:
            role = "admin"

        from nepse.application.auth.use_cases import _hasher
        if await users.get_by_email(body.email):
            raise EmailTaken(body.email)
        await users.add(body.email, _hasher.hash(body.password), role=role)
    except EmailTaken:
        raise HTTPException(409, "email already registered") from None
    ttl = timedelta(minutes=_settings().jwt_ttl_minutes)
    return TokenOut(access_token=await use_cases.login(users, body.email, body.password, secret, ttl))


@router.post("/login", response_model=TokenOut)
async def login(
    body: LoginIn, session: AsyncSession = Depends(get_session), secret: str = Depends(jwt_secret),
) -> TokenOut:
    ttl = timedelta(minutes=_settings().jwt_ttl_minutes)
    users = SqlUserRepo(session)
    user = await users.get_by_email(body.email.strip().lower())
    if user and not user.is_active:
        raise HTTPException(403, "Account has been suspended by administrator.")
    try:
        token = await use_cases.login(users, body.email, body.password, secret, ttl)
        if user:
            await users.update_last_login(user.id)
        return TokenOut(access_token=token)
    except use_cases.InvalidCredentials:
        raise HTTPException(401, "invalid email or password") from None
