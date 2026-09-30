from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Asset, Purchase, Transfer, Assignment, Expenditure
from security import require_roles

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Set to False if your expenditure router does NOT lower assets.quantity
EXPENDITURE_REDUCES_STOCK = True


# ---------------------------------------------------------------- helpers
def resolve_scope(user, base_id: Optional[int]) -> Optional[int]:
    """Commander is always forced to their own base. Admin may pick any."""
    if user.role == "COMMANDER":
        if not user.base_id:
            raise HTTPException(403, "No base assigned to this user")
        return user.base_id
    return base_id


def _num(q) -> int:
    return int(q.scalar() or 0)


def _sum(db, column):
    return db.query(func.coalesce(func.sum(column), 0))


def _dated(q, column, d_from, d_to):
    if d_from:
        q = q.filter(column >= d_from)
    if d_to:
        q = q.filter(column <= d_to)
    return q


def stock_now(db, base_id, type_id) -> int:
    q = _sum(db, Asset.quantity)
    if base_id:
        q = q.filter(Asset.base_id == base_id)
    if type_id:
        q = q.filter(Asset.equipment_type_id == type_id)
    return _num(q)


def movement_totals(db, base_id, type_id, d_from, d_to) -> dict:
    """Purchases (Received), completed transfers and recorded expenditures."""
    # Purchases
    pq = _sum(db, Purchase.quantity).filter(Purchase.status == "Received")
    if base_id:
        pq = pq.filter(Purchase.base_id == base_id)
    if type_id:
        pq = pq.filter(Purchase.equipment_type_id == type_id)
    purchases = _num(_dated(pq, Purchase.purchase_date, d_from, d_to))

    # Transfers
    def transfer_query():
        q = _sum(db, Transfer.quantity).filter(Transfer.status == "Completed")
        if type_id:
            q = q.join(Asset, Asset.id == Transfer.asset_id).filter(
                Asset.equipment_type_id == type_id
            )
        return _dated(q, Transfer.transfer_date, d_from, d_to)

    if base_id:
        t_in = _num(transfer_query().filter(Transfer.to_base_id == base_id))
        t_out = _num(transfer_query().filter(Transfer.from_base_id == base_id))
    else:
        # All bases together: every transfer is both an "in" and an "out"
        t_in = t_out = _num(transfer_query())

    # Expenditures
    eq = _sum(db, Expenditure.quantity).filter(Expenditure.status == "Recorded")
    if base_id:
        eq = eq.filter(Expenditure.base_id == base_id)
    if type_id:
        eq = eq.join(Asset, Asset.id == Expenditure.asset_id).filter(
            Asset.equipment_type_id == type_id
        )
    expended = _num(_dated(eq, Expenditure.expenditure_date, d_from, d_to))

    return {
        "purchases": purchases,
        "transfer_in": t_in,
        "transfer_out": t_out,
        "expended": expended,
    }


def assigned_total(db, base_id, type_id, as_of) -> int:
    q = _sum(db, Assignment.quantity).filter(Assignment.status == "Active")
    if base_id:
        q = q.filter(Assignment.base_id == base_id)
    if type_id:
        q = q.join(Asset, Asset.id == Assignment.asset_id).filter(
            Asset.equipment_type_id == type_id
        )
    q = q.filter(Assignment.assigned_date <= as_of)
    return _num(q)


def compute(db, base_id, type_id, d_from, d_to) -> dict:
    in_range = movement_totals(db, base_id, type_id, d_from, d_to)
    since_start = movement_totals(db, base_id, type_id, d_from, None)

    # Opening = stock now, rolled back through everything since the start date
    net_since = (
        since_start["purchases"]
        + since_start["transfer_in"]
        - since_start["transfer_out"]
    )
    opening = stock_now(db, base_id, type_id) - net_since
    if EXPENDITURE_REDUCES_STOCK:
        opening += since_start["expended"]

    net_movement = (
        in_range["purchases"] + in_range["transfer_in"] - in_range["transfer_out"]
    )
    assigned = assigned_total(db, base_id, type_id, d_to or date.today())
    closing = opening + net_movement - assigned - in_range["expended"]

    return {
        "opening_balance": opening,
        "purchases": in_range["purchases"],
        "transfer_in": in_range["transfer_in"],
        "transfer_out": in_range["transfer_out"],
        "net_movement": net_movement,
        "assigned": assigned,
        "expended": in_range["expended"],
        "closing_balance": closing,
    }


# -------------------------------------------------------------- endpoints
@router.get("/")
def dashboard(
    base_id: Optional[int] = None,
    equipment_type_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    scope = resolve_scope(user, base_id)
    return compute(db, scope, equipment_type_id, date_from, date_to)


@router.get("/breakdown")
def breakdown(
    group_by: str = "base",          # "base" or "equipment"
    base_id: Optional[int] = None,
    equipment_type_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    """One row per base or per equipment type. The frontend maps ids to names
    using /bases/ and /equipment-types/."""
    if group_by not in ("base", "equipment"):
        raise HTTPException(400, "group_by must be 'base' or 'equipment'")

    scope = resolve_scope(user, base_id)
    rows = []

    if group_by == "base":
        ids_q = db.query(Asset.base_id).distinct()
        if scope:
            ids_q = ids_q.filter(Asset.base_id == scope)
        if equipment_type_id:
            ids_q = ids_q.filter(Asset.equipment_type_id == equipment_type_id)
        for (bid,) in ids_q.all():
            rows.append({"base_id": bid,
                         **compute(db, bid, equipment_type_id, date_from, date_to)})
    else:
        ids_q = db.query(Asset.equipment_type_id).distinct()
        if scope:
            ids_q = ids_q.filter(Asset.base_id == scope)
        if equipment_type_id:
            ids_q = ids_q.filter(Asset.equipment_type_id == equipment_type_id)
        for (tid,) in ids_q.all():
            rows.append({"equipment_type_id": tid,
                         **compute(db, scope, tid, date_from, date_to)})
    return rows


def _transfer_rows(db, type_id, d_from, d_to, base_column=None, base_id=None):
    q = (
        db.query(Transfer, Asset)
        .join(Asset, Asset.id == Transfer.asset_id)
        .filter(Transfer.status == "Completed")
    )
    if type_id:
        q = q.filter(Asset.equipment_type_id == type_id)
    if base_column is not None and base_id:
        q = q.filter(base_column == base_id)
    q = _dated(q, Transfer.transfer_date, d_from, d_to)
    return [
        {
            "transfer_number": t.transfer_number,
            "date": t.transfer_date,
            "asset_name": a.asset_name,
            "quantity": t.quantity,
            "from_base_id": t.from_base_id,
            "to_base_id": t.to_base_id,
        }
        for t, a in q.order_by(Transfer.id.desc()).limit(200).all()
    ]


@router.get("/net-movement-details")
def net_movement_details(
    base_id: Optional[int] = None,
    equipment_type_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "COMMANDER")),
):
    """Lists behind the Net Movement pop-up."""
    scope = resolve_scope(user, base_id)

    pq = db.query(Purchase).filter(Purchase.status == "Received")
    if scope:
        pq = pq.filter(Purchase.base_id == scope)
    if equipment_type_id:
        pq = pq.filter(Purchase.equipment_type_id == equipment_type_id)
    pq = _dated(pq, Purchase.purchase_date, date_from, date_to)
    purchases = [
        {
            "purchase_number": p.purchase_number,
            "date": p.purchase_date,
            "asset_name": p.asset_name,
            "quantity": p.quantity,
            "base_id": p.base_id,
            "supplier": p.supplier,
        }
        for p in pq.order_by(Purchase.id.desc()).limit(200).all()
    ]

    return {
        "purchases": purchases,
        "transfer_in": _transfer_rows(
            db, equipment_type_id, date_from, date_to, Transfer.to_base_id, scope
        ),
        "transfer_out": _transfer_rows(
            db, equipment_type_id, date_from, date_to, Transfer.from_base_id, scope
        ),
    }