# packages/api-server/app/game/cards/__init__.py
from .acquire import apply_acquire
from .defend import apply_defend
from .fraud import apply_fraud
from .gain_funds import apply_gain_funds

__all__ = [
    "apply_acquire",
    "apply_defend",
    "apply_fraud",
    "apply_gain_funds",
]
