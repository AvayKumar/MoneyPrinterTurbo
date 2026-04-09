from fastapi import Query
from loguru import logger

from app.controllers.v1.base import new_router
from app.models.schema import SessionCreateRequest, SessionUpdateRequest
from app.services import session_db
from app.utils import utils

router = new_router()


@router.post("/sessions")
def create_session(request: SessionCreateRequest):
    name = request.name or ""
    if not name and request.form_state:
        name = request.form_state.get("video_subject", "") or "Untitled Session"
    result = session_db.create_session(
        name=name,
        form_state=request.form_state,
        llm_config=request.llm_config,
    )
    return utils.get_response(200, result)


@router.get("/sessions")
def list_sessions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    sessions, total = session_db.list_sessions(limit=limit, offset=offset)
    return utils.get_response(200, {"sessions": sessions, "total": total})


@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    session = session_db.get_session(session_id)
    if not session:
        return utils.get_response(404, message="Session not found")
    return utils.get_response(200, session)


@router.put("/sessions/{session_id}")
def update_session(session_id: str, request: SessionUpdateRequest):
    fields = {}
    if request.name is not None:
        fields["name"] = request.name
    if request.form_state is not None:
        fields["form_state"] = request.form_state
        if not fields.get("name") and request.form_state.get("video_subject"):
            fields["name"] = request.form_state["video_subject"]
    if request.llm_config is not None:
        fields["llm_config"] = request.llm_config

    result = session_db.update_session(session_id, **fields)
    if not result:
        return utils.get_response(404, message="Session not found")
    return utils.get_response(200, result)


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    deleted = session_db.delete_session(session_id)
    if not deleted:
        return utils.get_response(404, message="Session not found")
    return utils.get_response(200)
