from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    service_id: str
    user_password: str

class BaseCreate(BaseModel):
    base_code: str
    base_name: str
    location: Optional[str] = None

class EquipmentTypeCreate(BaseModel):
    type_name: str
    description: Optional[str] = None

class AssetCreate(BaseModel):
    asset_code: str
    asset_name: str
    equipment_type_id: int
    base_id: int
    quantity: int
    unit: str = "Unit"
    status: str = "Available"

class PurchaseCreate(BaseModel):
    base_id: int
    equipment_type_id: int
    asset_name: str
    quantity: int
    unit_price: Decimal = Decimal("0")
    supplier: Optional[str] = None
    purchase_date: date
    priority: str = "Medium"
    remarks: Optional[str] = None
    

class TransferCreate(BaseModel):
    asset_id: int
    from_base_id: int
    to_base_id: int
    quantity: int
    transfer_date: date
    priority: str = "Medium"
    reason: Optional[str] = None

class AssignmentCreate(BaseModel):
    asset_id: int
    personnel_name: str
    personnel_service_id: Optional[str] = None
    base_id: int
    quantity: int = Field(gt=0)
    assigned_date: date
    expected_return_date: Optional[date] = None
    remarks: Optional[str] = None
    assigned_by: Optional[int] = None    # ignored; server uses the token's user


class ExpenditureCreate(BaseModel):
    asset_id: int
    base_id: int
    quantity: int = Field(gt=0)
    purpose: Optional[str] = None
    personnel_name: Optional[str] = None
    expenditure_date: date
    remarks: Optional[str] = None
    recorded_by: Optional[int] = None 