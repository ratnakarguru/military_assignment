from datetime import date
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Assignment, Asset, AuditLog
from schemas import AssignmentCreate
from security import require_roles

router = APIRouter(prefix="/assignments", tags=["Assignments"])


def log_action(db, user, action, detail, entity_type=None, entity_id=None):
    db.add(AuditLog(
        user_id=user.id,
        action=action,
        detail=detail[:255],
        entity_type=entity_type,
        entity_id=entity_id,
    ))


@router.get("/")
def get_assignments(
    base_id: Optional[int] = None,
    equipment_type_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    q = db.query(Assignment)

    # Commander only ever sees their own base
    if user.role == "COMMANDER":
        q = q.filter(Assignment.base_id == user.base_id)
    elif base_id:
        q = q.filter(Assignment.base_id == base_id)

    if equipment_type_id:
        q = q.join(Asset, Asset.id == Assignment.asset_id).filter(
            Asset.equipment_type_id == equipment_type_id
        )
    if status:
        q = q.filter(Assignment.status == status)
    if date_from:
        q = q.filter(Assignment.assigned_date >= date_from)
    if date_to:
        q = q.filter(Assignment.assigned_date <= date_to)

    return q.order_by(Assignment.id.desc()).offset(skip).limit(limit).all()


@router.post("/", status_code=201)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    if data.quantity <= 0:
        raise HTTPException(400, "Quantity must be greater than zero")
    if data.assigned_date > date.today():
        raise HTTPException(400, "Assignment date cannot be in the future")
    if (data.expected_return_date
            and data.expected_return_date < data.assigned_date):
        raise HTTPException(400, "Expected return cannot be before assignment date")
    if user.role == "COMMANDER" and data.base_id != user.base_id:
        raise HTTPException(403, "You can only assign assets from your own base")

    # Lock the asset row so two requests cannot issue the same stock
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
    if asset.quantity < data.quantity:
        raise HTTPException(409, f"Insufficient stock (available: {asset.quantity})")

    assignment = Assignment(
        # temporary unique value: the column is NOT NULL, real number is set below
        assignment_number=f"TMP-{uuid4().hex[:10]}",
        asset_id=data.asset_id,
        personnel_name=data.personnel_name,
        personnel_service_id=data.personnel_service_id,
        base_id=data.base_id,
        quantity=data.quantity,
        assigned_date=data.assigned_date,
        expected_return_date=data.expected_return_date,
        status="Active",
        remarks=data.remarks,
        assigned_by=user.id,              # from token, not from client
    )
    db.add(assignment)
    db.flush()                            # gets the real id
    assignment.assignment_number = f"ASN-{1000 + assignment.id}"

    # Issued items leave the shelf. They come back when the assignment is returned.
    asset.quantity -= data.quantity
    if asset.quantity == 0:
        asset.status = "Assigned"

    log_action(
        db, user, "CREATE_ASSIGNMENT",
        f"{assignment.assignment_number} asset={asset.id} qty={data.quantity} "
        f"to={data.personnel_name}",
        "assignment", assignment.id,
    )
    db.commit()                           # record, stock change and log together
    db.refresh(assignment)
    return assignment


@router.patch("/{assignment_id}/return")
def return_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id)
        .with_for_update()
        .first()
    )
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    if user.role == "COMMANDER" and assignment.base_id != user.base_id:
        raise HTTPException(403, "Not your base")
    if assignment.status != "Active":
        raise HTTPException(409, "Assignment is already returned")

    asset = (
        db.query(Asset)
        .filter(Asset.id == assignment.asset_id)
        .with_for_update()
        .first()
    )
    if not asset:
        # Never mark it returned if the stock cannot be restored
        raise HTTPException(409, "Asset record is missing, cannot restore stock")

    asset.quantity += assignment.quantity
    asset.status = "Available"

    assignment.status = "Returned"
    assignment.actual_return_date = date.today()

    log_action(
        db, user, "RETURN_ASSIGNMENT",
        f"{assignment.assignment_number} qty={assignment.quantity} returned",
        "assignment", assignment.id,
    )
    db.commit()
    db.refresh(assignment)
    return assignment