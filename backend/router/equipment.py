from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import EquipmentType
from schemas import EquipmentTypeCreate


router = APIRouter(
    prefix="/equipment-types",
    tags=["Equipment Types"]
)


@router.get("/")
def get_equipment_types(
    db: Session = Depends(get_db)
):
    return db.query(EquipmentType).all()


@router.post("/")
def create_equipment_type(
    data: EquipmentTypeCreate,
    db: Session = Depends(get_db)
):

    equipment = EquipmentType(
        type_name=data.type_name,
        description=data.description
    )

    db.add(equipment)
    db.commit()
    db.refresh(equipment)

    return equipment