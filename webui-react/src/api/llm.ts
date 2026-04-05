import client from './client'
import type { Character, CharactersRequest, ScriptChunk, ScriptChunksRequest, VideoPromptRequest, VideoScriptRequest, VideoTermsRequest } from '@/types'

export async function generateScript(data: VideoScriptRequest): Promise<string> {
  const res = await client.post<{ data: { video_script: string } }>('/scripts', data)
  return res.data.data.video_script
}

export async function generateTerms(data: VideoTermsRequest): Promise<string[]> {
  const res = await client.post<{ data: { video_terms: string[] } }>('/terms', data)
  return res.data.data.video_terms
}

export async function generateScriptChunks(data: ScriptChunksRequest): Promise<ScriptChunk[]> {
  const res = await client.post<{ data: { chunks: ScriptChunk[] } }>('/script-chunks', data)
  return res.data.data.chunks
}

export async function generateCharacters(data: CharactersRequest): Promise<Character[]> {
  const res = await client.post<{ data: { characters: Character[] } }>('/characters', data)
  return res.data.data.characters
}

export async function regenerateVideoPrompt(data: VideoPromptRequest): Promise<string> {
  const res = await client.post<{ data: { video_prompt: string } }>('/video-prompt', data)
  return res.data.data.video_prompt
}

export async function unloadOllamaModel(): Promise<void> {
  await client.post('/ollama/unload')
}
