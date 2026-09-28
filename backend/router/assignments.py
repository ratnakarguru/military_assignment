from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Assignment, Asset
from schemas import AssignmentCreate


router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"]
)


@router.get("/")
def get_assignments(
    db: Session = Depends(get_db)
):
    return (
        db.query(Assignment)
        .order_by(Assignment.id.desc())
        .all()
    )


@router.post("/")
def create_assignment(
    data: AssignmentCreate,
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
            detail="Insufficient asset quantity"
        )

    assignment_number = (
        f"ASN-{1000 + db.query(Assignment).count() + 1}"
    )

    assignment = Assignment(
        assignment_number=assignment_number,
        asset_id=data.asset_id,
        personnel_name=data.personnel_name,
        personnel_service_id=data.personnel_service_id,
        base_id=data.base_id,
        quantity=data.quantity,
        assigned_date=data.assigned_date,
        expected_return_date=data.expected_return_date,
        status="Active",
        remarks=data.remarks,
        assigned_by=data.assigned_by
    )

    db.add(assignment)

    asset.quantity -= data.quantity

    if asset.quantity == 0:
        asset.status = "Assigned"

    db.commit()
    db.refresh(assignment)

    return assignment


@router.patch("/{assignment_id}/return")
def return_assignment(
    assignment_id: int,
    db: Session = Depends(get_db)
):

    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id)
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found"
        )

    if assignment.status != "Active":
        raise HTTPException(
            status_code=400,
            detail="Assignment is already returned"
        )

    asset = (
        db.query(Asset)
        .filter(Asset.id == assignment.asset_id)
        .first()
    )

    if asset:
        asset.quantity += assignment.quantity
        asset.status = "Available"

    assignment.status = "Returned"
    assignment.actual_return_date = date.today()

    db.commit()
    db.refresh(assignment)

    return assignment