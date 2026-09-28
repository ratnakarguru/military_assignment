from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import (
    Asset,
    Purchase,
    Transfer,
    Assignment,
    Expenditure,
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/")
def dashboard(
    db: Session = Depends(get_db)
):

    total_assets = (
        db.query(func.coalesce(func.sum(Asset.quantity), 0))
        .scalar()
    )

    purchases = (
        db.query(func.coalesce(func.sum(Purchase.quantity), 0))
        .filter(Purchase.status == "Received")
        .scalar()
    )

    transfer_in = (
        db.query(func.coalesce(func.sum(Transfer.quantity), 0))
        .filter(Transfer.status == "Completed")
        .scalar()
    )

    transfer_out = (
        db.query(func.coalesce(func.sum(Transfer.quantity), 0))
        .filter(Transfer.status == "Completed")
        .scalar()
    )

    assigned = (
        db.query(func.coalesce(func.sum(Assignment.quantity), 0))
        .filter(Assignment.status == "Active")
        .scalar()
    )

    expended = (
        db.query(func.coalesce(func.sum(Expenditure.quantity), 0))
        .filter(Expenditure.status == "Recorded")
        .scalar()
    )

    net_movement = (
        purchases
        + transfer_in
        - transfer_out
    )

    return {
        "opening_balance": total_assets,
        "purchases": purchases,
        "transfer_in": transfer_in,
        "transfer_out": transfer_out,
        "net_movement": net_movement,
        "assigned": assigned,
        "expended": expended,
        "closing_balance": total_assets
    }