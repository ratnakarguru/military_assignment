from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    service_id: str
    user_password: str = Field(..., alias="password")

    model_config = {"populate_by_name": True}


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.service_id == data.service_id).first()

    invalid = HTTPException(401, "Invalid Service ID or password")
    if not user:
        raise invalid

    stored = user.user_password or ""
    if stored.startswith("$2"):                 # already hashed
        if not verify_password(data.user_password, stored):
            raise invalid
    else:                                       # old plain-text password
        if stored != data.user_password:
            raise invalid
        user.user_password = hash_password(data.user_password)
        db.commit()

    return {
        "message": "Login successful",
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "service_id": user.service_id,
            "username": user.username,
            "user_role": user.user_role,
            "base": user.base,
        },
    }