import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ACCESS_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Hardening prod: empêcher une clé faible en prod
if os.getenv("ENV", "dev") != "dev" and SECRET_KEY == "change-me":
    raise RuntimeError("SECRET_KEY must be set in production (not 'change-me').")


def create_access_token(subject: str):
    exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MINUTES)
    payload = {"sub": subject, "type": "access", "exp": exp}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, exp


def create_refresh_token(subject: str):
    exp = datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)
    payload = {"sub": subject, "type": "refresh", "exp": exp}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, exp


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise ValueError("Invalid token type")
        return payload
    except (JWTError, ValueError) as e:
        raise ValueError("Invalid access token") from e


def decode_refresh_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        return payload
    except (JWTError, ValueError) as e:
        raise ValueError("Invalid refresh token") from e
