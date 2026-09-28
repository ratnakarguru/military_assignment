from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import User


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


class LoginRequest(BaseModel):
    service_id: str
    user_password: str = Field(..., alias="password")

    model_config = {
        "populate_by_name": True,
    }


@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.service_id == data.service_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Service ID not found"
        )

    if user.user_password != data.user_password:
        raise HTTPException(
            status_code=401,
            detail="Password is incorrect"
        )

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "service_id": user.service_id,
            "username": user.username,
            "user_role": user.user_role,
            "service_id": user.service_id,
            "base": user.base
        }
    }