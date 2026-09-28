from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Asset
from schemas import AssetCreate


router = APIRouter(
    prefix="/assets",
    tags=["Assets"]
)


@router.get("/")
def get_assets(
    db: Session = Depends(get_db)
):
    return db.query(Asset).all()


@router.get("/{asset_id}")
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db)
):

    asset = (
        db.query(Asset)
        .filter(Asset.id == asset_id)
        .first()
    )

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    return asset


@router.post("/")
def create_asset(
    data: AssetCreate,
    db: Session = Depends(get_db)
):

    asset = Asset(
        asset_code=data.asset_code,
        asset_name=data.asset_name,
        equipment_type_id=data.equipment_type_id,
        base_id=data.base_id,
        quantity=data.quantity,
        unit=data.unit,
        status=data.status
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

    return asset