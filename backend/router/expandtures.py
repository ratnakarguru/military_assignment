from datetime import date
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Expenditure, Asset, Assignment, AuditLog
from schemas import ExpenditureCreate
from security import require_roles

router = APIRouter(prefix="/expenditures", tags=["Expenditures"])

# Set to True if your assignment router already lowers assets.quantity
# when an item is assigned (then do not subtract active assignments again).
ASSIGNMENTS_REDUCE_STOCK = True


def log_action(db, user, action, detail, entity_type=None, entity_id=None):
    db.add(AuditLog(
        user_id=user.id,
        action=action,
        detail=detail[:255],
        entity_type=entity_type,
        entity_id=entity_id,
    ))


@router.get("/")
def get_expenditures(
    base_id: Optional[int] = None,
    equipment_type_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    q = db.query(Expenditure)

    # Commander only ever sees their own base
    if user.role == "COMMANDER":
        q = q.filter(Expenditure.base_id == user.base_id)
    elif base_id:
        q = q.filter(Expenditure.base_id == base_id)

    if equipment_type_id:
        q = q.join(Asset, Asset.id == Expenditure.asset_id).filter(
            Asset.equipment_type_id == equipment_type_id
        )
    if date_from:
        q = q.filter(Expenditure.expenditure_date >= date_from)
    if date_to:
        q = q.filter(Expenditure.expenditure_date <= date_to)

    return q.order_by(Expenditure.id.desc()).offset(skip).limit(limit).all()


@router.post("/", status_code=201)
def create_expenditure(
    data: ExpenditureCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    if data.quantity <= 0:
        raise HTTPException(400, "Quantity must be greater than zero")
    if data.expenditure_date > date.today():
        raise HTTPException(400, "Expenditure date cannot be in the future")
    if user.role == "COMMANDER" and data.base_id != user.base_id:
        raise HTTPException(403, "You can only record expenditure for your own base")

    # Lock the asset row so two requests cannot spend the same stock
    asset = (
        db.query(Asset)
        .filter(Asset.id == data.asset_id)
        .with_for_update()
        .first()
    )
    if not asset:
        raise HTTPException(404, "Asset not found")
    if asset.base_id != data.base_id:
        raise HTTPException(400, "Asset does not belong to selected base")

    # Items currently issued to personnel cannot also be expended
    assigned = 0
    if not ASSIGNMENTS_REDUCE_STOCK:
        assigned = int(
            db.query(func.coalesce(func.sum(Assignment.quantity), 0))
            .filter(Assignment.asset_id == asset.id,
                    Assignment.status == "Active")
            .scalar() or 0
        )
    available = asset.quantity - assigned
    if data.quantity > available:
        raise HTTPException(409, f"Insufficient stock (available: {available})")

    expenditure = Expenditure(
        # temporary unique value: the column is NOT NULL, real number is set below
        expenditure_number=f"TMP-{uuid4().hex[:10]}",
        asset_id=data.asset_id,
        base_id=data.base_id,
        quantity=data.quantity,
        purpose=data.purpose,
        personnel_name=data.personnel_name,
        expenditure_date=data.expenditure_date,
        status="Recorded",
        remarks=data.remarks,
        recorded_by=user.id,              # from token, not from client
    )
    db.add(expenditure)
    db.flush()                            # gets the real id
    expenditure.expenditure_number = f"EXP-{1000 + expenditure.id}"

    asset.quantity -= data.quantity
    if asset.quantity == 0:
        asset.status = "Inactive"

    log_action(
        db, user, "CREATE_EXPENDITURE",
        f"{expenditure.expenditure_number} asset={asset.id} qty={data.quantity}",
        "expenditure", expenditure.id,
    )
    db.commit()                           # record, stock change and log together
    db.refresh(expenditure)
    return expenditure