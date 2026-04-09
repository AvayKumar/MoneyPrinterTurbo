import client from './client'
import type { FormState, LlmConfig } from '@/types'

export interface SessionSummary {
  id: string
  name: string
  updated_at: string
}

export interface SessionFull extends SessionSummary {
  form_state: FormState
  llm_config: LlmConfig
  created_at: string
}

export interface SessionCreateData {
  name?: string
  form_state: FormState
  llm_config: LlmConfig
}

export interface SessionUpdateData {
  name?: string
  form_state?: FormState
  llm_config?: LlmConfig
}

export async function listSessions(
  limit = 50,
  offset = 0,
): Promise<{ sessions: SessionSummary[]; total: number }> {
  const res = await client.get<{
    data: { sessions: SessionSummary[]; total: number }
  }>('/sessions', { params: { limit, offset } })
  return res.data.data
}

export async function getSession(id: string): Promise<SessionFull> {
  const res = await client.get<{ data: SessionFull }>(`/sessions/${id}`)
  return res.data.data
}

export async function createSession(
  data: SessionCreateData,
): Promise<SessionSummary> {
  const res = await client.post<{ data: SessionSummary }>('/sessions', data)
  return res.data.data
}

export async function updateSession(
  id: string,
  data: SessionUpdateData,
): Promise<SessionSummary> {
  const res = await client.put<{ data: SessionSummary }>(
    `/sessions/${id}`,
    data,
  )
  return res.data.data
}

export async function deleteSession(id: string): Promise<void> {
  await client.delete(`/sessions/${id}`)
}
