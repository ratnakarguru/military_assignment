from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine

# IMPORTANT:
# Import models before create_all()
import models

from router import (
    auth,
    dashboard,
    bases,
    equipment,
    assests,
    purchase,
    transfers,
    assignments,
    expandtures,
    approvals,
    audit
)

# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Military Asset Management System API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://military-assignment-f0hx227hc-ratnakarguru.vercel.app/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(bases.router, prefix="/api/v1")
app.include_router(equipment.router, prefix="/api/v1")
app.include_router(assests.router, prefix="/api/v1")
app.include_router(purchase.router, prefix="/api/v1")
app.include_router(transfers.router, prefix="/api/v1")
app.include_router(assignments.router, prefix="/api/v1")
app.include_router(expandtures.router, prefix="/api/v1")
app.include_router(approvals.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "Military Asset Management System API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }