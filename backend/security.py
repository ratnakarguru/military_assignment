import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User
from dotenv import load_dotenv

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-env-file")
ALGORITHM = "HS256"
TOKEN_HOURS = 4

bearer = HTTPBearer()

# Your DB stores roles in several forms; map them all to 3 clean names
ROLE_MAP = {
    "1": "ADMIN", "ADMIN": "ADMIN",
    "2": "COMMANDER", "BC001": "COMMANDER", "BASE COMMANDER": "COMMANDER",
    "3": "LOGISTICS", "LO001": "LOGISTICS", "LOGISTICS OFFICER": "LOGISTICS",
}


def normalize_role(raw) -> str | None:
    return ROLE_MAP.get(str(raw).strip().upper())


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def create_access_token(user) -> str:
    payload = {
        "sub": str(user.id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@dataclass
class CurrentUser:
    id: int
    username: str
    role: str
    base_id: int | None


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> CurrentUser:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(401, "Invalid or expired token")

    # Always read role/base from the DB, never trust the client
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "User no longer exists")

    role = normalize_role(user.user_role)
    if not role:
        raise HTTPException(403, "Unknown role")

    base = int(user.base) if user.base not in (None, "") else None
    return CurrentUser(id=user.id, username=user.username, role=role, base_id=base)


def require_roles(*allowed: str):
    def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(403, "You do not have permission for this action")
        return user
    return checker