from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import BaseLocation
from schemas import BaseCreate


router = APIRouter(
    prefix="/bases",
    tags=["Bases"]
)


@router.get("/")
def get_bases(
    db: Session = Depends(get_db)
):
    return db.query(BaseLocation).all()


@router.get("/{base_id}")
def get_base(
    base_id: int,
    db: Session = Depends(get_db)
):
    base = (
        db.query(BaseLocation)
        .filter(BaseLocation.id == base_id)
        .first()
    )

    if not base:
        raise HTTPException(
            status_code=404,
            detail="Base not found"
        )

    return base


@router.post("/")
def create_base(
    data: BaseCreate,
    db: Session = Depends(get_db)
):

    base = BaseLocation(
        base_code=data.base_code,
        base_name=data.base_name,
        location=data.location
    )

    db.add(base)
    db.commit()
    db.refresh(base)

    return base