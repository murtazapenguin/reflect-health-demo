from datetime import datetime, timezone
from typing import List

import bcrypt as _bcrypt
from beanie import Document, Indexed
from pydantic import Field


class User(Document):
    email: Indexed(str, unique=True)
    display_name: str
    hashed_password: str
    roles: List[str] = Field(default_factory=lambda: ["admin"])
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def verify_password(self, password: str) -> bool:
        return _bcrypt.checkpw(
            password.encode("utf-8"),
            self.hashed_password.encode("utf-8"),
        )

    @staticmethod
    def hash_password(password: str) -> str:
        return _bcrypt.hashpw(
            password.encode("utf-8"),
            _bcrypt.gensalt(),
        ).decode("utf-8")

    class Settings:
        name = "users"
