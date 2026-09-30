from datetime import date, datetime, time
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import AuditLog, User
from security import require_roles

# Read-only on purpose: audit records are append-only.
# Never add update or delete endpoints here.
router = APIRouter(prefix="/audit-logs", tags=["Audit"])


@router.get("/")
def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    base_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    admin=Depends(require_roles("ADMIN")),      # audit trail is Admin only
):
    q = db.query(AuditLog, User).outerjoin(User, User.id == AuditLog.user_id)

    if action:
        q = q.filter(AuditLog.action == action)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if base_id:
        q = q.filter(User.base == base_id)
    if date_from:
        q = q.filter(AuditLog.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        q = q.filter(AuditLog.created_at <= datetime.combine(date_to, time.max))

    rows = (
        q.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(skip)
        .limit(min(limit, 500))
        .all()
    )

    result = []
    for log, person in rows:
        person_base = None
        if person is not None and person.base not in (None, ""):
            try:
                person_base = int(person.base)
            except (TypeError, ValueError):
                person_base = None

        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "username": person.username if person else None,
            "service_id": person.service_id if person else None,
            "base_id": person_base,                 # the user's base
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "description": log.description or log.detail,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
        })
    return result