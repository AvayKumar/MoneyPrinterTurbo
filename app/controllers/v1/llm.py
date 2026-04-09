from fastapi import Request

from app.controllers.v1.base import new_router
from app.models.schema import (
    CharactersRequest,
    CharactersResponse,
    NarrationScriptRequest,
    NarrationScriptResponse,
    ScriptChunksRequest,
    ScriptChunksResponse,
    VideoPromptRequest,
    VideoPromptResponse,
    VideoScriptRequest,
    VideoScriptResponse,
    VideoTermsRequest,
    VideoTermsResponse,
)
from app.services import llm
from app.utils import utils

# authentication dependency
# router = new_router(dependencies=[Depends(base.verify_token)])
router = new_router()


@router.post(
    "/scripts",
    response_model=VideoScriptResponse,
    summary="Create a script for the video",
)
def generate_video_script(request: Request, body: VideoScriptRequest):
    video_script = llm.generate_script(
        video_subject=body.video_subject,
        language=body.video_language,
        paragraph_number=body.paragraph_number,
    )
    response = {"video_script": video_script}
    return utils.get_response(200, response)


@router.post(
    "/terms",
    response_model=VideoTermsResponse,
    summary="Generate video terms based on the video script",
)
def generate_video_terms(request: Request, body: VideoTermsRequest):
    video_terms = llm.generate_terms(
        video_subject=body.video_subject,
        video_script=body.video_script,
        amount=body.amount,
    )
    response = {"video_terms": video_terms}
    return utils.get_response(200, response)


@router.post(
    "/narration-script",
    response_model=NarrationScriptResponse,
    summary="Rewrite a video script as a natural TTS narration",
)
def generate_narration_script(request: Request, body: NarrationScriptRequest):
    narration_script = llm.generate_narration_script(
        video_script=body.video_script,
        language=body.video_language or "",
    )
    return utils.get_response(200, {"narration_script": narration_script})


@router.post(
    "/script-chunks",
    response_model=ScriptChunksResponse,
    summary="Split a script into ~2-3 second chunks and generate an image prompt per chunk",
)
def generate_video_script_chunks(request: Request, body: ScriptChunksRequest):
    chunks = llm.generate_script_chunks(
        video_script=body.video_script,
        language=body.language,
        image_style_prompt=body.image_style_prompt or "",
        character_names=body.character_names or [],
    )
    response = {"chunks": chunks}
    return utils.get_response(200, response)


@router.post(
    "/video-prompt",
    response_model=VideoPromptResponse,
    summary="Regenerate the video animation prompt for a single script chunk",
)
def regenerate_video_prompt(request: Request, body: VideoPromptRequest):
    video_prompt = llm.generate_video_prompt(
        chunk_text=body.chunk_text,
        image_prompt=body.image_prompt,
        character_names=body.character_names or [],
    )
    return utils.get_response(200, {"video_prompt": video_prompt})


@router.post(
    "/characters",
    response_model=CharactersResponse,
    summary="Extract main characters from a script and generate visual reference descriptions",
)
def generate_video_characters(request: Request, body: CharactersRequest):
    characters = llm.generate_characters(
        video_script=body.video_script,
        image_style_prompt=body.image_style_prompt or "",
    )
    response = {"characters": characters}
    return utils.get_response(200, response)


@router.post(
    "/ollama/unload",
    summary="Immediately unload the current Ollama model from memory",
)
def unload_ollama_model(request: Request):
    try:
        result = llm.unload_ollama_model()
        return utils.get_response(200, result)
    except Exception as e:
        return utils.get_response(500, message=str(e))
