from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class User:
    id: int
    email: str
    password_hash: str


class EmailTaken(Exception):
    pass


class UserRepo(Protocol):
    async def get_by_email(self, email: str) -> User | None: ...

    async def add(self, email: str, password_hash: str) -> int:
        """Raises EmailTaken on a duplicate email."""
        ...
