from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Purchase, Asset
from schemas import PurchaseCreate


router = APIRouter(
    prefix="/purchases",
    tags=["Purchases"]
)


@router.get("/")
def get_purchases(
    db: Session = Depends(get_db)
):
    return (
        db.query(Purchase)
        .order_by(Purchase.id.desc())
        .all()
    )


@router.get("/{purchase_id}")
def get_purchase(
    purchase_id: int,
    db: Session = Depends(get_db)
):

    purchase = (
        db.query(Purchase)
        .filter(Purchase.id == purchase_id)
        .first()
    )

    if not purchase:
        raise HTTPException(
            status_code=404,
            detail="Purchase not found"
        )

    return purchase


@router.post("/")
def create_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db)
):

    purchase_number = (
        f"PUR-{1000 + db.query(Purchase).count() + 1}"
    )

    purchase = Purchase(
        purchase_number=purchase_number,
        base_id=data.base_id,
        equipment_type_id=data.equipment_type_id,
        asset_name=data.asset_name,
        quantity=data.quantity,
        unit_price=data.unit_price,
        supplier=data.supplier,
        purchase_date=data.purchase_date,
        priority=data.priority,
        status="Pending",
        remarks=data.remarks,
        created_by=data.created_by
    )

    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    return purchase


@router.patch("/{purchase_id}/status")
def update_purchase_status(
    purchase_id: int,
    status: str,
    db: Session = Depends(get_db)
):

    purchase = (
        db.query(Purchase)
        .filter(Purchase.id == purchase_id)
        .first()
    )

    if not purchase:
        raise HTTPException(
            status_code=404,
            detail="Purchase not found"
        )

    purchase.status = status

    db.commit()
    db.refresh(purchase)

    return purchase