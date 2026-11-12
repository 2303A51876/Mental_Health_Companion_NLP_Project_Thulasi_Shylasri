import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

# argon2 preferred; bcrypt verified for legacy/imported hashes.
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: str, role: str) -> str:
    s = get_settings()
    payload = {"sub": user_id, "role": role, "type": "access",
               "iat": _now(), "exp": _now() + timedelta(minutes=s.ACCESS_TOKEN_MINUTES)}
    return jwt.encode(payload, s.JWT_SECRET, algorithm=s.JWT_ALGORITHM)


def decode_token(token: str, expected_type: str = "access") -> dict:
    s = get_settings()
    try:
        data = jwt.decode(token, s.JWT_SECRET, algorithms=[s.JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError("invalid token") from exc
    if data.get("type") != expected_type:
        raise ValueError("wrong token type")
    return data


def new_refresh_token() -> tuple[str, str]:
    """Return (opaque_token, sha256_hash). Only the hash is stored."""
    raw = secrets.token_urlsafe(48)
    return raw, hashlib.sha256(raw.encode()).hexdigest()


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
