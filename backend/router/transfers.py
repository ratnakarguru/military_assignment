from datetime import date
from enum import Enum
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import Transfer, Asset, AuditLog
from schemas import TransferCreate
from security import require_roles

router = APIRouter(prefix="/transfers", tags=["Transfers"])


class TransferStatus(str, Enum):
    Pending = "Pending"
    Approved = "Approved"
    InTransit = "In Transit"
    Completed = "Completed"
    Rejected = "Rejected"
    Cancelled = "Cancelled"


class StatusUpdate(BaseModel):
    status: TransferStatus


ALLOWED_MOVES = {
    "Pending": {"Approved", "Rejected", "Cancelled"},
    "Approved": {"In Transit", "Completed", "Cancelled"},
    "In Transit": {"Completed", "Cancelled"},
}


def log_action(db, user, action, detail):
    db.add(AuditLog(user_id=user.id, action=action, detail=detail))


@router.get("/")
def get_transfers(
    base_id: Optional[int] = None,
    equipment_type_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER", "LOGISTICS")),
):
    q = db.query(Transfer)

    # Non-admins only see transfers that involve their own base
    if user.role != "ADMIN":
        q = q.filter(or_(Transfer.from_base_id == user.base_id,
                         Transfer.to_base_id == user.base_id))
    elif base_id:
        q = q.filter(or_(Transfer.from_base_id == base_id,
                         Transfer.to_base_id == base_id))

    if equipment_type_id:
        q = q.join(Asset, Asset.id == Transfer.asset_id).filter(
            Asset.equipment_type_id == equipment_type_id)
    if date_from:
        q = q.filter(Transfer.transfer_date >= date_from)
    if date_to:
        q = q.filter(Transfer.transfer_date <= date_to)
    if status:
        q = q.filter(Transfer.status == status)

    return q.order_by(Transfer.id.desc()).offset(skip).limit(limit).all()


@router.get("/{transfer_id}")
def get_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER", "LOGISTICS")),
):
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(404, "Transfer not found")
    if user.role != "ADMIN" and user.base_id not in (
        transfer.from_base_id, transfer.to_base_id
    ):
        raise HTTPException(403, "Not your base")
    return transfer


@router.post("/", status_code=201)
def create_transfer(
    data: TransferCreate,
    db: Session = Depends(get_db),
    user=Depends(
        require_roles(
            "ADMIN",
            "COMMANDER",
            "LOGISTICS"
        )
    ),
):
    if data.from_base_id == data.to_base_id:
        raise HTTPException(
            status_code=400,
            detail="Source and destination bases cannot be same"
        )

    # Non-admin users can transfer only from their own base
    if user.role != "ADMIN" and data.from_base_id != user.base_id:
        raise HTTPException(
            status_code=403,
            detail="You can only transfer out of your own base"
        )

    if data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    # Lock asset row
    asset = (
        db.query(Asset)
        .filter(Asset.id == data.asset_id)
        .with_for_update()
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
            status_code=409,
            detail=f"Insufficient asset quantity. Available: {asset.quantity}"
        )

    # Generate number BEFORE INSERT
    transfer_number = f"TRF-{uuid4().hex[:8].upper()}"

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
        requested_by=user.id,
    )

    db.add(transfer)

    try:
        db.flush()

        log_action(
            db,
            user,
            "CREATE_TRANSFER",
            (
                f"{transfer.transfer_number} "
                f"asset={asset.id} "
                f"qty={data.quantity} "
                f"{data.from_base_id}->{data.to_base_id}"
            )
        )

        db.commit()
        db.refresh(transfer)

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to create transfer: {str(error)}"
        )

    return transfer


@router.patch("/{transfer_id}/status")
def update_transfer_status(
    transfer_id: int,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    transfer = (
        db.query(Transfer)
        .filter(Transfer.id == transfer_id)
        .with_for_update()
        .first()
    )
    if not transfer:
        raise HTTPException(404, "Transfer not found")

    old, new = transfer.status, body.status.value
    if new not in ALLOWED_MOVES.get(old, set()):
        raise HTTPException(409, f"Cannot change status from {old} to {new}")

    # Receiving base confirms completion; sending base handles everything else
    owner_base = transfer.to_base_id if new == "Completed" else transfer.from_base_id
    if user.role == "COMMANDER" and user.base_id != owner_base:
        raise HTTPException(403, "Only the responsible base commander can do this")

    if new == "Completed":
        source = (
            db.query(Asset)
            .filter(Asset.id == transfer.asset_id)
            .with_for_update()
            .first()
        )
        if not source or source.quantity < transfer.quantity:
            raise HTTPException(409, "Insufficient stock at source base")

        source.quantity -= transfer.quantity

        dest = (
            db.query(Asset)
            .filter(
                Asset.base_id == transfer.to_base_id,
                Asset.asset_name == source.asset_name,
                Asset.equipment_type_id == source.equipment_type_id,
            )
            .with_for_update()
            .first()
        )
        if dest:
            dest.quantity += transfer.quantity
        else:
            # First time this asset reaches the destination base.
            # If asset_code is UNIQUE in your table, the suffix keeps it valid.
            # Copy any other Asset columns you have here.
            db.add(Asset(
                asset_name=source.asset_name,
                asset_code=f"{source.asset_code}-B{transfer.to_base_id}",
                equipment_type_id=source.equipment_type_id,
                base_id=transfer.to_base_id,
                quantity=transfer.quantity,
            ))

    transfer.status = new
    log_action(db, user, "UPDATE_TRANSFER_STATUS",
               f"{transfer.transfer_number}: {old} -> {new}")
    db.commit()               # transfer, stock changes and audit log together
    db.refresh(transfer)
    return transfer