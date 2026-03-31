import client from './client'
import type { VideoScriptRequest, VideoTermsRequest } from '@/types'

export async function generateScript(data: VideoScriptRequest): Promise<string> {
  const res = await client.post<{ data: { video_script: string } }>('/scripts', data)
  return res.data.data.video_script
}

export async function generateTerms(data: VideoTermsRequest): Promise<string[]> {
  const res = await client.post<{ data: { video_terms: string[] } }>('/terms', data)
  return res.data.data.video_terms
}
