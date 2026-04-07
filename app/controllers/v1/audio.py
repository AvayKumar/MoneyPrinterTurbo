import os
import tempfile
from typing import Optional

import requests as http_requests
from fastapi import Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask

from app.config import config
from app.controllers import base
from app.controllers.v1.base import new_router
from app.models.exception import HttpException
from app.services.voice import (
    get_all_azure_voices,
    get_audio_duration,
    get_custom_tts_voices,
    get_gemini_voices,
    get_siliconflow_voices,
    tts as voice_tts,
)
from app.utils import utils

router = new_router()

# 5-minute timeout — first inference may require model load on the TTS server
_TTS_TIMEOUT = 300


class PreviewVoiceRequest(BaseModel):
    voice_name: str
    voice_rate: float = 1.0
    voice_volume: float = 1.0
    text: Optional[str] = None


@router.get("/voices", summary="List available voices for a TTS server")
def get_voices(request: Request, tts_server: str = Query("custom-tts")):
    if tts_server == "siliconflow":
        raw = get_siliconflow_voices()
    elif tts_server == "gemini":
        raw = get_gemini_voices()
    elif tts_server == "custom-tts":
        base_url = config.app.get("custom_tts_base_url", "http://192.168.1.19:7080")
        raw = get_custom_tts_voices(base_url, timeout=_TTS_TIMEOUT)
    elif tts_server == "azure-v2":
        raw = [v for v in get_all_azure_voices() if "-V2-" in v]
    else:  # azure-v1 (default)
        raw = [v for v in get_all_azure_voices() if "-V2-" not in v]

    voices = [{"value": v, "label": v} for v in raw]
    return utils.get_response(200, {"voices": voices})


@router.post("/tts-chunk", summary="Generate persistent TTS audio for a script chunk")
def generate_tts_chunk(request: Request, body: PreviewVoiceRequest):
    request_id = base.get_task_id(request)
    preview_dir = utils.task_dir("tts-previews")
    os.makedirs(preview_dir, exist_ok=True)
    voice_file = os.path.join(preview_dir, f"{utils.get_uuid()}.mp3")
    try:
        sub_maker = voice_tts(
            text=body.text or "",
            voice_name=body.voice_name,
            voice_rate=body.voice_rate,
            voice_file=voice_file,
            voice_volume=body.voice_volume,
        )
        if not os.path.exists(voice_file) or os.path.getsize(voice_file) == 0:
            raise RuntimeError("TTS generated no audio output")
        duration = get_audio_duration(voice_file)
        filename = os.path.basename(voice_file)
        return utils.get_response(200, {"audio_url": f"/api/audio-preview/{filename}", "duration": duration})
    except Exception as e:
        if os.path.exists(voice_file):
            os.unlink(voice_file)
        raise HttpException("", status_code=500, message=f"{request_id}: {str(e)}")


@router.get("/audio-preview/{filename}", summary="Serve a persisted TTS preview MP3")
async def serve_audio_preview(_: Request, filename: str):
    audio_path = os.path.join(utils.task_dir("tts-previews"), filename)
    return FileResponse(audio_path, media_type="audio/mpeg")


@router.post("/unload-audio-model", summary="Unload the custom TTS model from memory")
def unload_audio_model(request: Request):
    request_id = base.get_task_id(request)
    base_url = config.app.get("custom_tts_base_url", "http://192.168.1.19:7080")
    try:
        resp = http_requests.post(f"{base_url}/unload", timeout=30)
        resp.raise_for_status()
        return utils.get_response(200, {"message": "Audio model unloaded"})
    except Exception as e:
        raise HttpException("", status_code=500, message=f"{request_id}: {str(e)}")


@router.post("/preview-voice", summary="Preview a TTS voice, returns audio/mpeg")
def preview_voice(request: Request, body: PreviewVoiceRequest):
    request_id = base.get_task_id(request)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        voice_tts(
            text=body.text or "Hello, this is a voice preview.",
            voice_name=body.voice_name,
            voice_rate=body.voice_rate,
            voice_file=tmp_path,
            voice_volume=body.voice_volume,
        )
        if not os.path.exists(tmp_path) or os.path.getsize(tmp_path) == 0:
            raise RuntimeError("TTS generated no audio output")
        return FileResponse(
            tmp_path,
            media_type="audio/mpeg",
            background=BackgroundTask(os.unlink, tmp_path),
        )
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HttpException(
            "", status_code=500, message=f"{request_id}: {str(e)}"
        )
