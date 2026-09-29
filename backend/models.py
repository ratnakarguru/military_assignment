from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, func, DECIMAL, Date, Text
from database import Base
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel
# from sqlalchemy import ForeignKey


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=True)
    user_role = Column(String(150), nullable=True)
    user_password = Column(String(255), nullable=True)
    service_id = Column(String(50), nullable=True, unique=True, index=True)
    base = Column(Integer, nullable=True)


    def __repr__(self):
        return (
            f"User("
            f"id={self.id}, "
            f"username={self.username}, "
            f"user_role={self.user_role}, "
            f"service_id={self.service_id}"
            f")"
        )

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column( String(50), unique=True, nullable=False )
    asset_name = Column( String(150), nullable=False )
    equipment_type_id = Column( Integer, ForeignKey("equipment_types.id"), nullable=False )

    base_id = Column(
        Integer,
        ForeignKey("bases.id"),
        nullable=False
    )

    quantity = Column(
        Integer,
        default=0
    )

    unit = Column(
        String(30),
        default="Unit"
    )

    status = Column(
        Enum(
            "Available",
            "Assigned",
            "Maintenance",
            "Inactive"
        ),
        default="Available"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True)

    purchase_number = Column(
        String(50),
        unique=True,
        nullable=False
    )

    base_id = Column(
        Integer,
        ForeignKey("bases.id"),
        nullable=False
    )

    equipment_type_id = Column(
        Integer,
        ForeignKey("equipment_types.id"),
        nullable=False
    )

    asset_name = Column(
        String(150),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    unit_price = Column(
        DECIMAL(15, 2),
        default=0
    )

    supplier = Column(String(150))

    purchase_date = Column(
        Date,
        nullable=False
    )

    priority = Column(
        Enum(
            "Low",
            "Medium",
            "High",
            "Critical"
        ),
        default="Medium"
    )

    status = Column(
        Enum(
            "Pending",
            "Approved",
            "Rejected",
            "Received"
        ),
        default="Pending"
    )

    remarks = Column(Text)

    created_by = Column(
        Integer,
        ForeignKey("user.id")
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True)

    transfer_number = Column(
        String(50),
        unique=True,
        nullable=False
    )

    asset_id = Column(
        Integer,
        ForeignKey("assets.id"),
        nullable=False
    )

    from_base_id = Column(
        Integer,
        ForeignKey("bases.id"),
        nullable=False
    )

    to_base_id = Column(
        Integer,
        ForeignKey("bases.id"),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    transfer_date = Column(
        Date,
        nullable=False
    )

    priority = Column(
        Enum(
            "Low",
            "Medium",
            "High",
            "Critical"
        ),
        default="Medium"
    )

    status = Column(
        Enum(
            "Available",
            "Assigned",
            "Maintenance",
            "Inactive",
            name="asset_status_enum",
            native_enum=False
        ),
        default="Available"
    )

    reason = Column(Text)

    requested_by = Column(
        Integer,
        ForeignKey("user.id")
    )

    approved_by = Column(
        Integer,
        ForeignKey("user.id")
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True)

    assignment_number = Column(
        String(50),
        unique=True,
        nullable=False
    )

    asset_id = Column(
        Integer,
        ForeignKey("assets.id"),
        nullable=False
    )

    personnel_name = Column(
        String(150),
        nullable=False
    )

    personnel_service_id = Column(
        String(50)
    )

    base_id = Column(
        Integer,
        ForeignKey("bases.id"),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    assigned_date = Column(
        Date,
        nullable=False
    )

    expected_return_date = Column(Date)

    actual_return_date = Column(Date)

    status = Column(
        Enum(
            "Active",
            "Returned",
            "Lost",
            "Damaged"
        ),
        default="Active"
    )

    remarks = Column(Text)

    assigned_by = Column(
        Integer,
        ForeignKey("user.id")
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

class Expenditure(Base):
    __tablename__ = "expenditures"

    id = Column(Integer, primary_key=True)

    expenditure_number = Column(
        String(50),
        unique=True,
        nullable=False
    )

    asset_id = Column(
        Integer,
        ForeignKey("assets.id"),
        nullable=False
    )

    base_id = Column(
        Integer,
        ForeignKey("bases.id"),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    purpose = Column(String(150))

    personnel_name = Column(String(150))

    expenditure_date = Column(
        Date,
        nullable=False
    )

    status = Column(
        Enum(
            "Recorded",
            "Approved",
            "Cancelled"
        ),
        default="Recorded"
    )

    remarks = Column(Text)

    recorded_by = Column(
        Integer,
        ForeignKey("user.id")
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

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
    unit_price: Decimal = 0
    supplier: Optional[str] = None
    purchase_date: date
    priority: str = "Medium"
    remarks: Optional[str] = None
    created_by: int

class TransferCreate(BaseModel):
    asset_id: int
    from_base_id: int
    to_base_id: int
    quantity: int
    transfer_date: date
    priority: str = "Medium"
    reason: Optional[str] = None
    requested_by: int

class AssignmentCreate(BaseModel):
    asset_id: int
    personnel_name: str
    personnel_service_id: Optional[str] = None
    base_id: int
    quantity: int
    assigned_date: date
    expected_return_date: Optional[date] = None
    remarks: Optional[str] = None
    assigned_by: int

class ExpenditureCreate(BaseModel):
    asset_id: int
    base_id: int
    quantity: int
    purpose: Optional[str] = None
    personnel_name: Optional[str] = None
    expenditure_date: date
    remarks: Optional[str] = None
    recorded_by: int

class BaseLocation(Base):
    __tablename__ = "bases"

    id = Column(Integer, primary_key=True, index=True)
    base_code = Column(String(20), unique=True, nullable=False)
    base_name = Column(String(100), nullable=False)
    location = Column(String(150))
    status = Column(
        Enum("Active", "Inactive"),
        default="Active"
    )
    created_at = Column(
        DateTime,
        server_default=func.now()
    )

class BaseCreate(BaseModel):
    base_code: str
    base_name: str
    location: Optional[str] = None

class EquipmentTypeCreate(BaseModel):
    type_name: str
    description: Optional[str] = None

class EquipmentType(Base):
    __tablename__ = "equipment_types"

    id = Column(Integer, primary_key=True, index=True)

    type_name = Column(
        String(100),
        unique=True,
        nullable=False
    )

    description = Column(String(255))