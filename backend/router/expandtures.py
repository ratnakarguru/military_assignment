from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Expenditure, Asset
from schemas import ExpenditureCreate


router = APIRouter(
    prefix="/expenditures",
    tags=["Expenditures"]
)


@router.get("/")
def get_expenditures(
    db: Session = Depends(get_db)
):
    return (
        db.query(Expenditure)
        .order_by(Expenditure.id.desc())
        .all()
    )


@router.post("/")
def create_expenditure(
    data: ExpenditureCreate,
    db: Session = Depends(get_db)
):

    asset = (
        db.query(Asset)
        .filter(Asset.id == data.asset_id)
        .first()
    )

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    if asset.base_id != data.base_id:
        raise HTTPException(
            status_code=400,
            detail="Asset does not belong to selected base"
        )

    if asset.quantity < data.quantity:
        raise HTTPException(
            status_code=400,
            detail="Insufficient stock"
        )

    expenditure_number = (
        f"EXP-{1000 + db.query(Expenditure).count() + 1}"
    )

    expenditure = Expenditure(
        expenditure_number=expenditure_number,
        asset_id=data.asset_id,
        base_id=data.base_id,
        quantity=data.quantity,
        purpose=data.purpose,
        personnel_name=data.personnel_name,
        expenditure_date=data.expenditure_date,
        status="Recorded",
        remarks=data.remarks,
        recorded_by=data.recorded_by
    )

    db.add(expenditure)

    asset.quantity -= data.quantity

    if asset.quantity == 0:
        asset.status = "Inactive"

    db.commit()
    db.refresh(expenditure)

    return expenditure