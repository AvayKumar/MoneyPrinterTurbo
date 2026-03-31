import client from './client'
import type {
  TaskVideoRequest,
  TaskResponse,
  TaskQueryResponse,
  TaskData,
} from '@/types'

export async function createVideoTask(data: TaskVideoRequest): Promise<string> {
  const res = await client.post<TaskResponse>('/videos', data)
  return res.data.data.task_id
}

export async function getTask(taskId: string): Promise<TaskData> {
  const res = await client.get<TaskQueryResponse>(`/tasks/${taskId}`)
  return res.data.data as TaskData
}

export async function listTasks(page = 1, pageSize = 10): Promise<TaskData[]> {
  const res = await client.get<TaskQueryResponse>('/tasks', {
    params: { page, page_size: pageSize },
  })
  const data = res.data.data
  return Array.isArray(data) ? data : [data]
}

export async function deleteTask(taskId: string): Promise<void> {
  await client.delete(`/tasks/${taskId}`)
}

export async function uploadVideoMaterials(files: File[]): Promise<void> {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  await client.post('/video_materials', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
