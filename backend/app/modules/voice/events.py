"""In-memory SSE event store for live call orchestration."""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, Optional

from loguru import logger

_sessions: Dict[str, asyncio.Queue] = {}
_active_session: Optional[str] = None


def start_session(conversation_id: str) -> None:
    global _active_session
    if conversation_id in _sessions:
        logger.info("Session {} already exists, resetting", conversation_id)
        _sessions.pop(conversation_id, None)
    _sessions[conversation_id] = asyncio.Queue()
    _active_session = conversation_id
    logger.info("Started orchestration session: {}", conversation_id)
    emit_event("session_started", {"conversation_id": conversation_id})


def emit_event(event_type: str, payload: Dict[str, Any]) -> None:
    """Emit an event to the active session's queue."""
    session_id = _active_session
    if not session_id or session_id not in _sessions:
        logger.debug("No active session for event {}", event_type)
        return
    event = {
        "type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": payload,
    }
    try:
        _sessions[session_id].put_nowait(event)
        logger.info("Emitted event '{}' to session {}", event_type, session_id[:12])
    except asyncio.QueueFull:
        logger.warning("Event queue full for session {}", session_id)


async def subscribe(conversation_id: str) -> AsyncGenerator[str, None]:
    """Async generator that yields SSE-formatted events for a session."""
    queue = _sessions.get(conversation_id)
    if not queue:
        logger.warning("No session found for subscribe: {}", conversation_id)
        return

    while True:
        try:
            event = await asyncio.wait_for(queue.get(), timeout=15.0)
            yield f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"
        except asyncio.TimeoutError:
            yield f": heartbeat\n\n"
        except asyncio.CancelledError:
            break


def end_session(conversation_id: str) -> None:
    global _active_session
    if conversation_id in _sessions:
        emit_event("session_ended", {"conversation_id": conversation_id})
        _sessions.pop(conversation_id, None)
        if _active_session == conversation_id:
            _active_session = None
        logger.info("Ended orchestration session: {}", conversation_id)
