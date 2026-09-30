from datetime import date
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Purchase, AuditLog
from schemas import PurchaseCreate
from security import require_roles  # decodes JWT, checks role, returns user
import uuid

router = APIRouter(prefix="/purchases", tags=["Purchases"])


class PurchaseStatus(str, Enum):
    Pending = "Pending"
    Approved = "Approved"
    Ordered = "Ordered"
    Rejected = "Rejected"


class StatusUpdate(BaseModel):
    status: PurchaseStatus


def log_action(db, user, action, detail):
    db.add(AuditLog(user_id=user.id, action=action, detail=detail))


@router.get("/")
def get_purchases(
    base_id: Optional[int] = None,
    equipment_type_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER", "LOGISTICS")),
):
    q = db.query(Purchase)

    # base scoping: commander always sees only own base
    if user.role == "COMMANDER":
        q = q.filter(Purchase.base_id == user.base_id)
    elif base_id:
        q = q.filter(Purchase.base_id == base_id)

    if equipment_type_id:
        q = q.filter(Purchase.equipment_type_id == equipment_type_id)
    if date_from:
        q = q.filter(Purchase.purchase_date >= date_from)
    if date_to:
        q = q.filter(Purchase.purchase_date <= date_to)

    return q.order_by(Purchase.id.desc()).offset(skip).limit(limit).all()


@router.post("/", status_code=201)
def create_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER", "LOGISTICS")),
):
    if user.role in ["COMMANDER", "LOGISTICS"]:
        if data.base_id != user.base_id:
            raise HTTPException(
                status_code=403,
                detail="You can only purchase for your own base"
            )

    purchase_number = f"PUR-{uuid.uuid4().hex[:8].upper()}"

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
        created_by=user.id,
    )

    db.add(purchase)

    try:
        db.flush()

        log_action(
            db,
            user,
            "CREATE_PURCHASE",
            f"{purchase.purchase_number} qty={data.quantity}"
        )

        db.commit()
        db.refresh(purchase)

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to create purchase: {str(error)}"
        )

    return purchase


@router.patch("/{purchase_id}/status")
def update_purchase_status(
    purchase_id: int,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(404, "Purchase not found")
    if user.role == "COMMANDER" and purchase.base_id != user.base_id:
        raise HTTPException(403, "Not your base")

    old = purchase.status
    purchase.status = body.status.value
    log_action(db, user, "UPDATE_PURCHASE_STATUS", f"{purchase.purchase_number}: {old} -> {body.status.value}")
    db.commit()
    db.refresh(purchase)
    return purchase