"""
Background scheduler: auto-retrain when pending verified samples exceed threshold.
"""

import logging
import os
import threading
import time
from datetime import datetime

from database import SessionLocal

logger = logging.getLogger("continuous_learning")

CHECK_INTERVAL_SEC = int(os.getenv("FORENSIC_SCHEDULER_INTERVAL_SEC", str(24 * 3600)))
AUTO_RETRAIN_THRESHOLD = int(os.getenv("FORENSIC_AUTO_RETRAIN_THRESHOLD", "50"))

_scheduler_thread: threading.Thread | None = None
_stop_event = threading.Event()


def _should_run_training() -> bool:
    from verified_dataset_service import count_pending
    db = SessionLocal()
    try:
        return count_pending(db) >= AUTO_RETRAIN_THRESHOLD
    finally:
        db.close()


def _run_auto_training() -> None:
    from training_job import is_training_running, start_training
    from verified_dataset_service import count_pending, mark_samples_trained

    if is_training_running():
        logger.info("Training already running; skipping auto-retrain.")
        return

    db = SessionLocal()
    try:
        pending = count_pending(db)
        if pending < AUTO_RETRAIN_THRESHOLD:
            return
        logger.info("Auto-retrain triggered: %s pending samples", pending)
        start_training(epochs=20, batch_size=16, lr=1e-4)
        mark_samples_trained(db)
    except Exception as e:
        logger.exception("Auto-retrain failed: %s", e)
    finally:
        db.close()


def _scheduler_loop() -> None:
    history_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "training_scheduler_log.json",
    )
    while not _stop_event.is_set():
        try:
            if _should_run_training():
                _run_auto_training()
        except Exception as e:
            logger.exception("Scheduler check error: %s", e)
        _stop_event.wait(CHECK_INTERVAL_SEC)


def start_continuous_learning_scheduler() -> None:
    global _scheduler_thread
    if _scheduler_thread and _scheduler_thread.is_alive():
        return
    _stop_event.clear()
    _scheduler_thread = threading.Thread(
        target=_scheduler_loop,
        name="forensic-continuous-learning",
        daemon=True,
    )
    _scheduler_thread.start()
    logger.info(
        "Continuous learning scheduler started (interval=%ss, threshold=%s)",
        CHECK_INTERVAL_SEC,
        AUTO_RETRAIN_THRESHOLD,
    )


def stop_continuous_learning_scheduler() -> None:
    _stop_event.set()
