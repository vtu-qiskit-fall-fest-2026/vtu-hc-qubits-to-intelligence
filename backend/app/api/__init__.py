"""QuantumGuard AI - API Package"""

from app.api.routes_simulator import router as simulator_router
from app.api.routes_baseline import router as baseline_router
from app.api.routes_detection import router as detection_router
from app.api.routes_alerts import router as alerts_router
from app.api.routes_history import router as history_router
from app.api.routes_evaluation import router as evaluation_router
from app.api.routes_audio import router as audio_router

__all__ = [
    "simulator_router",
    "baseline_router",
    "detection_router",
    "alerts_router",
    "history_router",
    "evaluation_router",
    "audio_router",
]
