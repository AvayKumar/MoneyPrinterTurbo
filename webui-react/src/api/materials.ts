import client from './client'

export interface MusicItem {
  name: string
  url: string
}

export interface FontItem {
  name: string
}

// Backend wraps responses as: { status, message, data: { files: [...] } }
export async function getMusics(): Promise<MusicItem[]> {
  const res = await client.get<{ data: { files: MusicItem[] } }>('/musics')
  return res.data.data?.files ?? []
}

export async function getFonts(): Promise<FontItem[]> {
  const res = await client.get<{ data: { fonts: FontItem[] } }>('/fonts')
  return res.data.data?.fonts ?? []
}

export async function getVideoMaterials(): Promise<{ name: string; size: number; file: string }[]> {
  const res = await client.get<{ data: { files: { name: string; size: number; file: string }[] } }>('/video_materials')
  return res.data.data?.files ?? []
}

export async function uploadMusic(file: File): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  await client.post('/musics', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
