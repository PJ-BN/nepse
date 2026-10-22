"""Register / login with argon2 password hashes and HS256 JWT access tokens."""
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from nepse.application.auth.ports import EmailTaken, UserRepo

_hasher = PasswordHasher()
_DUMMY_HASH = _hasher.hash("timing-equaliser")  # verified when the email is unknown, so timing leaks nothing


class InvalidCredentials(Exception):
    pass


class InvalidToken(Exception):
    pass


def _normalise(email: str) -> str:
    return email.strip().lower()


async def register(users: UserRepo, email: str, password: str) -> int:
    email = _normalise(email)
    if await users.get_by_email(email):
        raise EmailTaken(email)
    return await users.add(email, _hasher.hash(password))


async def login(users: UserRepo, email: str, password: str, secret: str, ttl: timedelta) -> str:
    user = await users.get_by_email(_normalise(email))
    try:
        _hasher.verify(user.password_hash if user else _DUMMY_HASH, password)
    except (VerifyMismatchError, InvalidHashError):
        raise InvalidCredentials from None
    if user is None:
        raise InvalidCredentials
    now = datetime.now(UTC)
    return jwt.encode({"sub": str(user.id), "iat": now, "exp": now + ttl}, secret, algorithm="HS256")


def user_id_from_token(token: str, secret: str) -> int:
    try:
        return int(jwt.decode(token, secret, algorithms=["HS256"], options={"require": ["sub", "exp"]})["sub"])
    except (jwt.PyJWTError, ValueError):
        raise InvalidToken from None
