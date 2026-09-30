from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import (
    User,
    Purchase,
    Transfer,
    Assignment,
    Expenditure,
    BaseLocation,
)

router = APIRouter(
    prefix="/approvals",
    tags=["Approvals"]
)

@router.get("/")
def get_approvals(db: Session = Depends(get_db)):

    approvals = []

    purchases = (
        db.query(Purchase).filter(Purchase.status == "Pending").order_by(Purchase.created_at.desc()).all()
    )

    for purchase in purchases:

        user = None

        if purchase.created_by:
            user = (
                db.query(User).filter(User.id == purchase.created_by).first()
            )

        base = (
    db.query(BaseLocation).filter(BaseLocation.id == purchase.base_id).first()
)

        approvals.append({
            "id": purchase.id,
            "request_id": purchase.id,
            "request_number": purchase.purchase_number,
            "type": "Purchase",
            "base_id": purchase.base_id,
            "base_name": base.base_name if base else "Unknown",
            "requested_by": purchase.created_by,
            "requested_by_name": (
                user.username if user else "Unknown"
            ),

            "asset_name": purchase.asset_name,
            "quantity": purchase.quantity,
            "date": str(purchase.purchase_date)
            if purchase.purchase_date else None,
            "priority": purchase.priority,
            "reason": purchase.remarks or "",
            "status": purchase.status,
            "created_at": (
                purchase.created_at.isoformat()
                if purchase.created_at
                else None
            ),
        })

    transfers = (
        db.query(Transfer)
        .filter(Transfer.status == "Pending")
        .order_by(Transfer.created_at.desc())
        .all()
    )

    for transfer in transfers:

        user = None
        if transfer.requested_by:
            user = (
                db.query(User)
                .filter(User.id == transfer.requested_by)
                .first()
            )

        from_base = (
            db.query(BaseLocation)
            .filter(BaseLocation.id == transfer.from_base_id)
            .first()
        )

        to_base = (
            db.query(BaseLocation)
            .filter(BaseLocation.id == transfer.to_base_id)
            .first()
        )

        approvals.append({
            "id": transfer.id,
            "request_id": transfer.id,
            "request_number": transfer.transfer_number,
            "type": "Transfer",
            "base_id": transfer.from_base_id,
            "base_name": (
                f"{from_base.base_name if from_base else 'Unknown'}"
                f" → "
                f"{to_base.base_name if to_base else 'Unknown'}"
            ),

            "requested_by": transfer.requested_by,
            "requested_by_name": (
                user.username if user else "Unknown"
            ),

            "asset_id": transfer.asset_id,
            "quantity": transfer.quantity,
            "date": str(transfer.transfer_date)
            if transfer.transfer_date else None,
            "priority": transfer.priority,
            "reason": transfer.reason or "",
            "status": transfer.status,
            "created_at": (
                transfer.created_at.isoformat()
                if transfer.created_at
                else None
            ),
        })

    assignments = (
        db.query(Assignment)
        .filter(Assignment.status == "Active")
        .order_by(Assignment.created_at.desc())
        .all()
    )

    for assignment in assignments:

        user = None

        if assignment.assigned_by:
            user = (
                db.query(User)
                .filter(User.id == assignment.assigned_by)
                .first()
            )

        base = (
            db.query(BaseLocation)
            .filter(BaseLocation.id == assignment.base_id)
            .first()
        )

        approvals.append({
            "id": assignment.id,
            "request_id": assignment.id,
            "request_number": assignment.assignment_number,
            "type": "Assignment",
            "base_id": assignment.base_id,
            "base_name": (
                base.base_name if base else "Unknown"
            ),

            "requested_by": assignment.assigned_by,
            "requested_by_name": (
                user.username if user else "Unknown"
            ),

            "personnel_name": assignment.personnel_name,
            "quantity": assignment.quantity,
            "date": str(assignment.assigned_date)
            if assignment.assigned_date else None,
            "priority": None,
            "reason": assignment.remarks or "",
            "status": assignment.status,
            "created_at": (
                assignment.created_at.isoformat()
                if assignment.created_at
                else None
            ),
        })

    expenditures = (
        db.query(Expenditure)
        .filter(Expenditure.status == "Recorded")
        .order_by(Expenditure.created_at.desc())
        .all()
    )

    for expenditure in expenditures:

        user = None

        if expenditure.recorded_by:
            user = (
                db.query(User)
                .filter(User.id == expenditure.recorded_by)
                .first()
            )

        base = (
            db.query(BaseLocation)
            .filter(BaseLocation.id == expenditure.base_id)
            .first()
        )

        approvals.append({
            "id": expenditure.id,
            "request_id": expenditure.id,
            "request_number": expenditure.expenditure_number,
            "type": "Expenditure",

            "base_id": expenditure.base_id,

            "base_name": (
                base.base_name if base else "Unknown"
            ),

            "requested_by": expenditure.recorded_by,

            "requested_by_name": (
                user.username if user else "Unknown"
            ),

            "quantity": expenditure.quantity,
            "date": str(expenditure.expenditure_date)
            if expenditure.expenditure_date else None,

            "priority": None,
            "reason": expenditure.purpose or "",
            "status": expenditure.status,
            "created_at": (
                expenditure.created_at.isoformat()
                if expenditure.created_at
                else None
            ),
        })

    # SORT ALL REQUESTS BY DATE
    approvals.sort(
        key=lambda x: x["created_at"] or "",
        reverse=True
    )

    return approvals

@router.patch("/{request_type}/{request_id}")
def update_approval(
    request_type: str,
    request_id: int,
    status: str,
    approved_by: int,
    db: Session = Depends(get_db),
):

    # -----------------------------------------------------
    # VALIDATE STATUS
    # -----------------------------------------------------

    if status not in ["Approved", "Rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be Approved or Rejected"
        )

    # -----------------------------------------------------
    # CHECK APPROVER
    # -----------------------------------------------------

    approver = (
        db.query(User)
        .filter(User.id == approved_by)
        .first()
    )

    if not approver:
        raise HTTPException(
            status_code=404,
            detail="Approver not found"
        )

    # Admin = 1
    # Base Commander = BC001

    role = str(approver.user_role or "")

    if role not in ["1", "BC001"]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to approve requests"
        )

    # -----------------------------------------------------
    # PURCHASE
    # -----------------------------------------------------

    if request_type.lower() == "purchase":

        purchase = (
            db.query(Purchase)
            .filter(Purchase.id == request_id)
            .first()
        )

        if not purchase:
            raise HTTPException(
                status_code=404,
                detail="Purchase request not found"
            )

        if purchase.status != "Pending":
            raise HTTPException(
                status_code=400,
                detail="Purchase is no longer pending"
            )

        purchase.status = status

    # -----------------------------------------------------
    # TRANSFER
    # -----------------------------------------------------

    elif request_type.lower() == "transfer":

        transfer = (
            db.query(Transfer)
            .filter(Transfer.id == request_id)
            .first()
        )

        if not transfer:
            raise HTTPException(
                status_code=404,
                detail="Transfer request not found"
            )

        if transfer.status != "Pending":
            raise HTTPException(
                status_code=400,
                detail="Transfer is no longer pending"
            )

        transfer.status = status

        if status == "Approved":
            transfer.approved_by = approved_by

    # -----------------------------------------------------
    # ASSIGNMENT
    # -----------------------------------------------------

    elif request_type.lower() == "assignment":

        assignment = (
            db.query(Assignment)
            .filter(Assignment.id == request_id)
            .first()
        )

        if not assignment:
            raise HTTPException(
                status_code=404,
                detail="Assignment request not found"
            )

        # Assignment currently uses Active as its state.
        # Do not change it automatically here unless your
        # database has a Pending status for assignments.

        raise HTTPException(
            status_code=400,
            detail="Assignment approval workflow is not configured yet"
        )

    # -----------------------------------------------------
    # EXPENDITURE
    # -----------------------------------------------------

    elif request_type.lower() == "expenditure":

        expenditure = (
            db.query(Expenditure)
            .filter(Expenditure.id == request_id)
            .first()
        )

        if not expenditure:
            raise HTTPException(
                status_code=404,
                detail="Expenditure request not found"
            )

        if expenditure.status != "Recorded":
            raise HTTPException(
                status_code=400,
                detail="Expenditure is no longer pending"
            )

        if status == "Approved":
            expenditure.status = "Approved"

        elif status == "Rejected":
            expenditure.status = "Cancelled"

    else:

        raise HTTPException(
            status_code=400,
            detail="Invalid request type"
        )

    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    try:

        db.commit()

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Unable to update approval: {str(error)}"
        )

    return {
        "message": f"{request_type} {status.lower()} successfully",
        "request_id": request_id,
        "request_type": request_type,
        "status": status,
        "approved_by": approved_by,
    }