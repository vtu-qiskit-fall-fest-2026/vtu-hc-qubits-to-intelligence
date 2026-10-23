"""QuantumGuard AI - Security Alerts API Routes"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from app.analytics.alerts import SecurityAlert
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=List[SecurityAlert])
def list_alerts(
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = Query(default=None)
):
    """List recorded security alerts with optional status filter."""
    return DatabaseRepository.list_alerts(limit=limit, status_filter=status)


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    """Mark an alert as acknowledged by the operator."""
    success = DatabaseRepository.acknowledge_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")
    return {"success": True, "alert_id": alert_id, "message": "Alert acknowledged."}
