from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Transfer, Asset
from schemas import TransferCreate


router = APIRouter(
    prefix="/transfers",
    tags=["Transfers"]
)


@router.get("/")
def get_transfers(
    db: Session = Depends(get_db)
):
    return (
        db.query(Transfer)
        .order_by(Transfer.id.desc())
        .all()
    )


@router.get("/{transfer_id}")
def get_transfer(
    transfer_id: int,
    db: Session = Depends(get_db)
):

    transfer = (
        db.query(Transfer)
        .filter(Transfer.id == transfer_id)
        .first()
    )

    if not transfer:
        raise HTTPException(
            status_code=404,
            detail="Transfer not found"
        )

    return transfer


@router.post("/")
def create_transfer(
    data: TransferCreate,
    db: Session = Depends(get_db)
):

    if data.from_base_id == data.to_base_id:
        raise HTTPException(
            status_code=400,
            detail="Source and destination bases cannot be same"
        )

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

    if asset.base_id != data.from_base_id:
        raise HTTPException(
            status_code=400,
            detail="Asset does not belong to source base"
        )

    if asset.quantity < data.quantity:
        raise HTTPException(
            status_code=400,
            detail="Insufficient asset quantity"
        )

    transfer_number = (
        f"TRF-{1000 + db.query(Transfer).count() + 1}"
    )

    transfer = Transfer(
        transfer_number=transfer_number,
        asset_id=data.asset_id,
        from_base_id=data.from_base_id,
        to_base_id=data.to_base_id,
        quantity=data.quantity,
        transfer_date=data.transfer_date,
        priority=data.priority,
        status="Pending",
        reason=data.reason,
        requested_by=data.requested_by
    )

    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    return transfer