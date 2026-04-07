import client from './client'

export async function unloadAudioModel(): Promise<void> {
  await client.post('/unload-audio-model')
}

export interface TtsChunkRequest {
  text: string
  voice_name: string
  voice_rate?: number
  voice_volume?: number
}

export interface TtsChunkResult {
  audio_url: string
  duration: number
}

export async function generateChunkAudio(data: TtsChunkRequest): Promise<TtsChunkResult> {
  const res = await client.post<{ data: TtsChunkResult }>('/tts-chunk', data)
  return res.data.data
}
