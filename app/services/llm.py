import json
import logging
import re
import requests
from typing import List

import g4f
from loguru import logger
from openai import AzureOpenAI, OpenAI
from openai.types.chat import ChatCompletion

from app.config import config

_max_retries = 5


def _generate_response(prompt: str) -> str:
    try:
        content = ""
        llm_provider = config.app.get("llm_provider", "openai")
        logger.info(f"llm provider: {llm_provider}")
        if llm_provider == "g4f":
            model_name = config.app.get("g4f_model_name", "")
            if not model_name:
                model_name = "gpt-3.5-turbo-16k-0613"
            content = g4f.ChatCompletion.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
            )
        else:
            api_version = ""  # for azure
            if llm_provider == "moonshot":
                api_key = config.app.get("moonshot_api_key")
                model_name = config.app.get("moonshot_model_name")
                base_url = "https://api.moonshot.cn/v1"
            elif llm_provider == "ollama":
                # api_key = config.app.get("openai_api_key")
                api_key = "ollama"  # any string works but you are required to have one
                model_name = config.app.get("ollama_model_name")
                base_url = config.app.get("ollama_base_url", "")
                if not base_url:
                    base_url = "http://localhost:11434/v1"
            elif llm_provider == "openai":
                api_key = config.app.get("openai_api_key")
                model_name = config.app.get("openai_model_name")
                base_url = config.app.get("openai_base_url", "")
                if not base_url:
                    base_url = "https://api.openai.com/v1"
            elif llm_provider == "oneapi":
                api_key = config.app.get("oneapi_api_key")
                model_name = config.app.get("oneapi_model_name")
                base_url = config.app.get("oneapi_base_url", "")
            elif llm_provider == "azure":
                api_key = config.app.get("azure_api_key")
                model_name = config.app.get("azure_model_name")
                base_url = config.app.get("azure_base_url", "")
                api_version = config.app.get("azure_api_version", "2024-02-15-preview")
            elif llm_provider == "gemini":
                api_key = config.app.get("gemini_api_key")
                model_name = config.app.get("gemini_model_name")
                base_url = config.app.get("gemini_base_url", "")
            elif llm_provider == "qwen":
                api_key = config.app.get("qwen_api_key")
                model_name = config.app.get("qwen_model_name")
                base_url = "***"
            elif llm_provider == "cloudflare":
                api_key = config.app.get("cloudflare_api_key")
                model_name = config.app.get("cloudflare_model_name")
                account_id = config.app.get("cloudflare_account_id")
                base_url = "***"
            elif llm_provider == "deepseek":
                api_key = config.app.get("deepseek_api_key")
                model_name = config.app.get("deepseek_model_name")
                base_url = config.app.get("deepseek_base_url")
                if not base_url:
                    base_url = "https://api.deepseek.com"
            elif llm_provider == "modelscope":
                api_key = config.app.get("modelscope_api_key")
                model_name = config.app.get("modelscope_model_name")
                base_url = config.app.get("modelscope_base_url")
                if not base_url:
                    base_url = "https://api-inference.modelscope.cn/v1/"
            elif llm_provider == "ernie":
                api_key = config.app.get("ernie_api_key")
                secret_key = config.app.get("ernie_secret_key")
                base_url = config.app.get("ernie_base_url")
                model_name = "***"
                if not secret_key:
                    raise ValueError(
                        f"{llm_provider}: secret_key is not set, please set it in the config.toml file."
                    )
            elif llm_provider == "pollinations":
                try:
                    base_url = config.app.get("pollinations_base_url", "")
                    if not base_url:
                        base_url = "https://text.pollinations.ai/openai"
                    model_name = config.app.get("pollinations_model_name", "openai-fast")
                   
                    # Prepare the payload
                    payload = {
                        "model": model_name,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "seed": 101  # Optional but helps with reproducibility
                    }
                    
                    # Optional parameters if configured
                    if config.app.get("pollinations_private"):
                        payload["private"] = True
                    if config.app.get("pollinations_referrer"):
                        payload["referrer"] = config.app.get("pollinations_referrer")
                    
                    headers = {
                        "Content-Type": "application/json"
                    }
                    
                    # Make the API request
                    response = requests.post(base_url, headers=headers, json=payload)
                    response.raise_for_status()
                    result = response.json()
                    
                    if result and "choices" in result and len(result["choices"]) > 0:
                        content = result["choices"][0]["message"]["content"]
                        return content.replace("\n", "")
                    else:
                        raise Exception(f"[{llm_provider}] returned an invalid response format")
                        
                except requests.exceptions.RequestException as e:
                    raise Exception(f"[{llm_provider}] request failed: {str(e)}")
                except Exception as e:
                    raise Exception(f"[{llm_provider}] error: {str(e)}")

            if llm_provider not in ["pollinations", "ollama"]:  # Skip validation for providers that don't require API key
                if not api_key:
                    raise ValueError(
                        f"{llm_provider}: api_key is not set, please set it in the config.toml file."
                    )
                if not model_name:
                    raise ValueError(
                        f"{llm_provider}: model_name is not set, please set it in the config.toml file."
                    )
                if not base_url:
                    raise ValueError(
                        f"{llm_provider}: base_url is not set, please set it in the config.toml file."
                    )

            if llm_provider == "qwen":
                import dashscope
                from dashscope.api_entities.dashscope_response import GenerationResponse

                dashscope.api_key = api_key
                response = dashscope.Generation.call(
                    model=model_name, messages=[{"role": "user", "content": prompt}]
                )
                if response:
                    if isinstance(response, GenerationResponse):
                        status_code = response.status_code
                        if status_code != 200:
                            raise Exception(
                                f'[{llm_provider}] returned an error response: "{response}"'
                            )

                        content = response["output"]["text"]
                        return content.replace("\n", "")
                    else:
                        raise Exception(
                            f'[{llm_provider}] returned an invalid response: "{response}"'
                        )
                else:
                    raise Exception(f"[{llm_provider}] returned an empty response")

            if llm_provider == "gemini":
                import google.generativeai as genai

                if not base_url:
                    genai.configure(api_key=api_key, transport="rest")
                else:
                    genai.configure(api_key=api_key, transport="rest", client_options={'api_endpoint': base_url})

                generation_config = {
                    "temperature": 0.5,
                    "top_p": 1,
                    "top_k": 1,
                    "max_output_tokens": 2048,
                }

                safety_settings = [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_ONLY_HIGH",
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_ONLY_HIGH",
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_ONLY_HIGH",
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_ONLY_HIGH",
                    },
                ]

                model = genai.GenerativeModel(
                    model_name=model_name,
                    generation_config=generation_config,
                    safety_settings=safety_settings,
                )

                try:
                    response = model.generate_content(prompt)
                    candidates = response.candidates
                    generated_text = candidates[0].content.parts[0].text
                except (AttributeError, IndexError) as e:
                    print("Gemini Error:", e)

                return generated_text

            if llm_provider == "cloudflare":
                response = requests.post(
                    f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model_name}",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a friendly assistant",
                            },
                            {"role": "user", "content": prompt},
                        ]
                    },
                )
                result = response.json()
                logger.info(result)
                return result["result"]["response"]

            if llm_provider == "ernie":
                response = requests.post(
                    "https://aip.baidubce.com/oauth/2.0/token", 
                    params={
                        "grant_type": "client_credentials",
                        "client_id": api_key,
                        "client_secret": secret_key,
                    }
                )
                access_token = response.json().get("access_token")
                url = f"{base_url}?access_token={access_token}"

                payload = json.dumps(
                    {
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.5,
                        "top_p": 0.8,
                        "penalty_score": 1,
                        "disable_search": False,
                        "enable_citation": False,
                        "response_format": "text",
                    }
                )
                headers = {"Content-Type": "application/json"}

                response = requests.request(
                    "POST", url, headers=headers, data=payload
                ).json()
                return response.get("result")

            if llm_provider == "azure":
                client = AzureOpenAI(
                    api_key=api_key,
                    api_version=api_version,
                    azure_endpoint=base_url,
                )

            if llm_provider == "modelscope":
                content = ''
                client = OpenAI(
                    api_key=api_key,
                    base_url=base_url,
                )
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    extra_body={"enable_thinking": False},
                    stream=True
                )
                if response:
                    for chunk in response:
                        if not chunk.choices:
                            continue
                        delta = chunk.choices[0].delta
                        if delta and delta.content:
                            content += delta.content
                    
                    if not content.strip():
                        raise ValueError("Empty content in stream response")
                    
                    return content.replace("\n", "")
                else:
                    raise Exception(f"[{llm_provider}] returned an empty response")

            else:
                client = OpenAI(
                    api_key=api_key,
                    base_url=base_url,
                )

            extra = {"extra_body": {"keep_alive": 30}} if llm_provider == "ollama" else {}
            response = client.chat.completions.create(
                model=model_name, messages=[{"role": "user", "content": prompt}], **extra
            )
            if response:
                if isinstance(response, ChatCompletion):
                    content = response.choices[0].message.content
                else:
                    raise Exception(
                        f'[{llm_provider}] returned an invalid response: "{response}", please check your network '
                        f"connection and try again."
                    )
            else:
                raise Exception(
                    f"[{llm_provider}] returned an empty response, please check your network connection and try again."
                )

        return content.replace("\n", "")
    except Exception as e:
        return f"Error: {str(e)}"


def generate_script(
    video_subject: str, language: str = "", paragraph_number: int = 1
) -> str:
    prompt = f"""
# Role: Video Script Generator

## Goals:
Generate a script for a video, depending on the subject of the video.

## Constrains:
1. the script is to be returned as a string with the specified number of paragraphs.
2. do not under any circumstance reference this prompt in your response.
3. get straight to the point, don't start with unnecessary things like, "welcome to this video".
4. you must not include any type of markdown or formatting in the script, never use a title.
5. only return the raw content of the script.
6. do not include "voiceover", "narrator" or similar indicators of what should be spoken at the beginning of each paragraph or line.
7. you must not mention the prompt, or anything about the script itself. also, never talk about the amount of paragraphs or lines. just write the script.
8. respond in the same language as the video subject.

# Initialization:
- video subject: {video_subject}
- number of paragraphs: {paragraph_number}
""".strip()
    if language:
        prompt += f"\n- language: {language}"

    final_script = ""
    logger.info(f"subject: {video_subject}")

    def format_response(response):
        # Clean the script
        # Remove asterisks, hashes
        response = response.replace("*", "")
        response = response.replace("#", "")

        # Remove markdown syntax
        response = re.sub(r"\[.*\]", "", response)
        response = re.sub(r"\(.*\)", "", response)

        # Split the script into paragraphs
        paragraphs = response.split("\n\n")

        # Select the specified number of paragraphs
        # selected_paragraphs = paragraphs[:paragraph_number]

        # Join the selected paragraphs into a single string
        return "\n\n".join(paragraphs)

    for i in range(_max_retries):
        try:
            response = _generate_response(prompt=prompt)
            if response:
                final_script = format_response(response)
            else:
                logging.error("gpt returned an empty response")

            # g4f may return an error message
            if final_script and "当日额度已消耗完" in final_script:
                raise ValueError(final_script)

            if final_script:
                break
        except Exception as e:
            logger.error(f"failed to generate script: {e}")

        if i < _max_retries:
            logger.warning(f"failed to generate video script, trying again... {i + 1}")
    if "Error: " in final_script:
        logger.error(f"failed to generate video script: {final_script}")
    else:
        logger.success(f"completed: \n{final_script}")
    return final_script.strip()


def generate_narration_script(video_script: str, language: str = "") -> str:
    prompt = f"""
# Role: Narration Script Writer

## Goals:
Rewrite the provided video script as a natural, conversational narration optimized for text-to-speech.

## Constraints:
1. Use clean text only — no markdown, no bullet points, no titles.
2. Use punctuation (commas, ellipses, em-dashes) to create natural pacing and pauses.
3. Write in short, punchy sentences. Break long sentences into shorter ones.
4. Keep a warm, engaging, conversational tone — as if speaking directly to the listener.
5. Do not add introductions, sign-offs, or any content not present in the original script.
6. Preserve the meaning and all key information from the original script.
7. Respond in the same language as the input script.
{f'- language: {language}' if language else ''}

# Input Script:
{video_script}
""".strip()

    for i in range(_max_retries):
        try:
            response = _generate_response(prompt=prompt)
            if response:
                response = response.replace("*", "").replace("#", "")
                response = re.sub(r"\[.*?\]", "", response)
                logger.success(f"narration script completed")
                return response.strip()
        except Exception as e:
            logger.error(f"failed to generate narration script: {e}")
        logger.warning(f"retrying narration script... {i + 1}")
    return ""


def generate_terms(video_subject: str, video_script: str, amount: int = 5) -> List[str]:
    prompt = f"""
# Role: Video Search Terms Generator

## Goals:
Generate {amount} search terms for stock videos, depending on the subject of a video.

## Constrains:
1. the search terms are to be returned as a json-array of strings.
2. each search term should consist of 1-3 words, always add the main subject of the video.
3. you must only return the json-array of strings. you must not return anything else. you must not return the script.
4. the search terms must be related to the subject of the video.
5. reply with english search terms only.

## Output Example:
["search term 1", "search term 2", "search term 3","search term 4","search term 5"]

## Context:
### Video Subject
{video_subject}

### Video Script
{video_script}

Please note that you must use English for generating video search terms; Chinese is not accepted.
""".strip()

    logger.info(f"subject: {video_subject}")

    search_terms = []
    response = ""
    for i in range(_max_retries):
        try:
            response = _generate_response(prompt)
            if "Error: " in response:
                logger.error(f"failed to generate video script: {response}")
                return response
            search_terms = json.loads(response)
            if not isinstance(search_terms, list) or not all(
                isinstance(term, str) for term in search_terms
            ):
                logger.error("response is not a list of strings.")
                continue

        except Exception as e:
            logger.warning(f"failed to generate video terms: {str(e)}")
            if response:
                match = re.search(r"\[.*]", response)
                if match:
                    try:
                        search_terms = json.loads(match.group())
                    except Exception as e:
                        logger.warning(f"failed to generate video terms: {str(e)}")
                        pass

        if search_terms and len(search_terms) > 0:
            break
        if i < _max_retries:
            logger.warning(f"failed to generate video terms, trying again... {i + 1}")

    logger.success(f"completed: \n{search_terms}")
    return search_terms


def generate_video_prompt(chunk_text: str, image_prompt: str, character_names: list[str] = []) -> str:
    """Generate a video animation prompt for a single script chunk."""
    characters_in_scene = ", ".join(character_names) if character_names else "none"
    video_prompt_input = f"""You are a cinematographer and motion director. Given the scene details below, write a concise video animation prompt for this scene.

Image description: "{image_prompt}"
Script segment: "{chunk_text}"
Characters in scene: {characters_in_scene}

Your prompt must cover ALL of the following in order:
1. Camera movement (pan, zoom, tilt, or static)
2. For each character present: what they physically do and what they say or express based on `Script segment` (in sequence)
3. Atmosphere, mood, background sounds and timing

Note: Don't add voice over or clip duration in the response

IMPORTANT: Always respond in English, regardless of the language of the script segment.

Return ONLY 2-4 sentences describing the animation. No markdown, no bullet points, no explanation.
Example: "Medium shot slowly zooms in. Alice steps forward and raises her hand, saying 'We have to go now.' Bob turns away silently, fists clenched. Rain begins to fall as the camera pulls back to reveal the empty street."
"""
    for i in range(_max_retries):
        try:
            result = _generate_response(video_prompt_input).strip()
            if result:
                return result
        except Exception as e:
            logger.warning(f"generate_video_prompt chunk '{chunk_text[:30]}' attempt {i + 1} failed: {e}")
    return ""


def generate_script_chunks(video_script: str, language: str = "", image_style_prompt: str = "", character_names: list[str] = []) -> list[dict]:
    """
    Phase 1: split script into ~2-3 second text chunks via one LLM call.
    Phase 2: for each chunk, generate an image prompt in a separate LLM call.
    Phase 3: identify which known characters appear in each chunk.
    Returns: list of {"text": str, "image_prompt": str, "character_names": list[str]}
    """
    # --- Phase 1: split into text chunks ---
    split_prompt = f"""You are a video script analyzer. Split the following script into short segments that each take approximately 2-3 seconds to speak naturally.

Script:
{video_script}

Return ONLY a valid JSON array of strings, where each string is one spoken segment:
["segment one text here", "segment two text here", ...]

Rules:
1. Each segment should be 8-15 words (approximately 2-3 seconds of speech at a natural pace)
2. Preserve the original wording exactly — do not paraphrase
3. Together all segments must cover the full script without gaps or repetition
4. Return ONLY the JSON array, no markdown, no explanation
"""
    text_chunks = []
    for i in range(_max_retries):
        try:
            result = _generate_response(split_prompt).strip()
            if result.startswith("```"):
                result = result.split("```")[1]
                if result.startswith("json"):
                    result = result[4:]
            parsed = json.loads(result.strip())
            if isinstance(parsed, list) and all(isinstance(c, str) for c in parsed):
                text_chunks = parsed
                break
        except Exception as e:
            logger.warning(f"generate_script_chunks phase1 attempt {i + 1} failed: {e}")

    if not text_chunks:
        return []

    # --- Phase 2: generate image prompt for each chunk in a loop ---
    chunks = []
    for chunk_text in text_chunks:
        image_prompt = ""
        style_suffix = f"\nVisual style requirement: {image_style_prompt}" if image_style_prompt else ""
        prompt_for_chunk = f"""You are a visual director. Given this short spoken script segment, write a vivid image/scene description suitable for stock video or AI image generation.

Script segment: "{chunk_text}"
Full script context: "{video_script}"{style_suffix}

IMPORTANT: Always respond in English, regardless of the language of the script segment.

Return ONLY the image description as a single sentence or short phrase. No markdown, no explanation.
"""
        for i in range(_max_retries):
            try:
                image_prompt = _generate_response(prompt_for_chunk).strip()
                if image_prompt:
                    break
            except Exception as e:
                logger.warning(
                    f"generate_script_chunks phase2 chunk '{chunk_text[:30]}' attempt {i + 1} failed: {e}"
                )

        # --- Phase 3: identify which known characters appear in this chunk ---
        scene_characters: list[str] = []
        if character_names:
            names_list = ", ".join(f'"{n}"' for n in character_names)
            char_prompt = f"""From this list of characters: [{names_list}], which ones appear or are referenced in the following scene from Script?

Script:
{video_script}

Scene: "{chunk_text}"

Return ONLY a valid JSON array of the matching character names. If none match, return [].
Example: ["Alice (Lead)", "Bob"]
Return ONLY the JSON array, no markdown, no explanation.
"""
            for i in range(_max_retries):
                try:
                    result = _generate_response(char_prompt).strip()
                    if result.startswith("```"):
                        result = result.split("```")[1]
                        if result.startswith("json"):
                            result = result[4:]
                    parsed = json.loads(result.strip())
                    if isinstance(parsed, list) and all(isinstance(n, str) for n in parsed):
                        scene_characters = [n for n in parsed if n in character_names]
                        break
                except Exception as e:
                    logger.warning(f"generate_script_chunks phase3 chunk '{chunk_text[:30]}' attempt {i + 1} failed: {e}")

        chunks.append({"text": chunk_text, "image_prompt": image_prompt, "character_names": scene_characters})

    logger.success(f"generated {len(chunks)} script chunks")
    return chunks


def unload_ollama_model() -> dict:
    """Send keep_alive=0 to Ollama to immediately unload the current model from memory."""
    base_url = config.app.get("ollama_base_url", "") or "http://localhost:11434/v1"
    native_base = base_url.rstrip("/")
    if native_base.endswith("/v1"):
        native_base = native_base[:-3]
    model_name = config.app.get("ollama_model_name", "")
    response = requests.post(
        f"{native_base}/api/chat",
        json={"model": model_name, "keep_alive": 0},
        timeout=10,
    )
    response.raise_for_status()
    logger.success(f"ollama model '{model_name}' unloaded")
    return {"model": model_name}


def generate_characters(video_script: str, image_style_prompt: str = "") -> list[dict]:
    """
    Phase 1: extract character names from the script in one LLM call.
    Phase 2: for each character, generate a visual description in a separate LLM call.
    Returns: list of {"name": str, "description": str}
    """
    # --- Phase 1: extract character names ---
    names_prompt = f"""You are a script analyst. Identify all main characters mentioned or implied in the following script of there are no main characters return empty array.

Script:
{video_script}

Return ONLY a valid JSON array of character name strings. Include only characters who play a meaningful role.
Append " (Lead)" to the name of the single most central protagonist of the story.

Example: ["Alice (Lead)", "The Old Man", "Robot Guard"]
Return ONLY the JSON array, no markdown, no explanation.
"""
    character_names = []
    for i in range(_max_retries):
        try:
            result = _generate_response(names_prompt).strip()
            if result.startswith("```"):
                result = result.split("```")[1]
                if result.startswith("json"):
                    result = result[4:]
            parsed = json.loads(result.strip())
            if isinstance(parsed, list) and all(isinstance(n, str) for n in parsed):
                character_names = parsed
                break
        except Exception as e:
            logger.warning(f"generate_characters phase1 attempt {i + 1} failed: {e}")

    if not character_names:
        return []

    # --- Phase 2: generate description for each character individually ---
    style_note = f"The visual style is: {image_style_prompt}. " if image_style_prompt else ""
    characters = []
    for name in character_names:
        description = ""
        desc_prompt = f"""You are a character designer. Write a detailed visual reference description for the character "{name}" from the following script.

Script:
{video_script}

{style_note}The description will be used to generate a consistent character reference image on a plain white background.

Rules:
1. Describe only "{name}" — one character only
2. Cover: age, build, hair, eyes, clothing, expression, pose
3. Start the description with: 'Full body character reference on white background: '
4. IMPORTANT: Always respond in English, regardless of the language of the script
5. Return ONLY the description as plain text, no markdown, no explanation
"""
        for i in range(_max_retries):
            try:
                description = _generate_response(desc_prompt).strip()
                if description:
                    break
            except Exception as e:
                logger.warning(f"generate_characters phase2 '{name}' attempt {i + 1} failed: {e}")

        characters.append({"name": name, "description": description})

    logger.success(f"generated {len(characters)} characters")
    return characters


if __name__ == "__main__":
    video_subject = "生命的意义是什么"
    script = generate_script(
        video_subject=video_subject, language="zh-CN", paragraph_number=1
    )
    print("######################")
    print(script)
    search_terms = generate_terms(
        video_subject=video_subject, video_script=script, amount=5
    )
    print("######################")
    print(search_terms)
    
