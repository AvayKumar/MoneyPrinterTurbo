import json
import os
import sqlite3
import threading
from datetime import datetime, timezone

from loguru import logger

from app.utils import utils

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None


def _get_db_path() -> str:
    db_dir = os.getenv("SESSION_DB_DIR", utils.storage_dir())
    os.makedirs(db_dir, exist_ok=True)
    return os.path.join(db_dir, "sessions.db")


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(_get_db_path(), check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
    return _conn


def init_db():
    conn = _get_conn()
    with _lock:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL DEFAULT '',
                form_state  TEXT NOT NULL DEFAULT '{}',
                llm_config  TEXT NOT NULL DEFAULT '{}',
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_updated_at
                ON sessions(updated_at DESC);
            """
        )
    logger.info(f"Session DB initialized at {_get_db_path()}")


def create_session(
    name: str = "",
    form_state: dict | None = None,
    llm_config: dict | None = None,
) -> dict:
    conn = _get_conn()
    session_id = utils.get_uuid()
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn.execute(
            "INSERT INTO sessions (id, name, form_state, llm_config, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                session_id,
                name,
                json.dumps(form_state or {}),
                json.dumps(llm_config or {}),
                now,
                now,
            ),
        )
        conn.commit()
    logger.info(f"Created session {session_id} ({name})")
    return {"id": session_id, "name": name, "updated_at": now}


def list_sessions(limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
    conn = _get_conn()
    total_row = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()
    total = total_row[0] if total_row else 0
    rows = conn.execute(
        "SELECT id, name, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    ).fetchall()
    sessions = [dict(r) for r in rows]
    return sessions, total


def get_session(session_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT id, name, form_state, llm_config, created_at, updated_at "
        "FROM sessions WHERE id = ?",
        (session_id,),
    ).fetchone()
    if not row:
        return None
    result = dict(row)
    result["form_state"] = json.loads(result["form_state"])
    result["llm_config"] = json.loads(result["llm_config"])
    return result


def update_session(session_id: str, **fields) -> dict | None:
    conn = _get_conn()
    existing = conn.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not existing:
        return None

    sets = []
    values = []
    for key in ("name", "form_state", "llm_config"):
        if key in fields and fields[key] is not None:
            sets.append(f"{key} = ?")
            val = fields[key]
            if key in ("form_state", "llm_config"):
                val = json.dumps(val)
            values.append(val)

    if not sets:
        return None

    now = datetime.now(timezone.utc).isoformat()
    sets.append("updated_at = ?")
    values.append(now)
    values.append(session_id)

    with _lock:
        conn.execute(
            f"UPDATE sessions SET {', '.join(sets)} WHERE id = ?",
            values,
        )
        conn.commit()

    return {"id": session_id, "name": fields.get("name", ""), "updated_at": now}


def delete_session(session_id: str) -> bool:
    conn = _get_conn()
    with _lock:
        cursor = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
    deleted = cursor.rowcount > 0
    if deleted:
        logger.info(f"Deleted session {session_id}")
    return deleted
