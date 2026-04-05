import axios from 'axios'

// Requests go to /tti/* which Vite proxies to http://192.168.1.19:7082
const ttiClient = axios.create({ baseURL: '/tti' })

// Requests go to /ttv/* which Vite proxies to http://192.168.1.19:7083
const ttvClient = axios.create({ baseURL: '/ttv' })

function getDimensions(aspect: string): { width: number; height: number } {
  const [w, h] = aspect.split(':').map(Number)
  // Keep shorter side at 720, scale longer side proportionally
  if (w <= h) {
    return { width: 720, height: Math.round((h / w) * 720) }
  } else {
    return { width: Math.round((w / h) * 720), height: 720 }
  }
}

export async function unloadTtiModel(): Promise<void> {
  await ttiClient.post('/unload')
}

export async function unloadVideoModel(): Promise<void> {
  await ttvClient.post('/unload')
}

export async function generateVideo(
  prompt: string,
  imageUrl: string,
  aspect = '9:16',
): Promise<string> {
  const { width, height } = getDimensions(aspect)

  const imgRes = await fetch(imageUrl)
  const imgBlob = await imgRes.blob()

  const form = new FormData()
  form.append('prompt', prompt)
  form.append('start_image', imgBlob, 'start_frame.png')
  form.append('model', 'ltx2_22b_distilled_int8')
  form.append('width', String(width))
  form.append('height', String(height))
  form.append('duration', '4.0')
  form.append('fps', '24')
  form.append('num_inference_steps', '8')
  form.append('seed', String(Math.floor(Math.random() * 2147483647)))

  const res = await ttvClient.post<{ data: Array<{ url: string }> }>(
    '/v1/videos/i2v',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  const url = res.data.data[0].url
  return url.startsWith('http') ? url : `/ttv${url}`
}

export async function generateImageWithReferences(
  prompt: string,
  referenceImageUrls: string[],
  aspect = '1:1',
  strength = 0.4,
): Promise<string> {
  const { width, height } = getDimensions(aspect)

  const form = new FormData()
  form.append('prompt', prompt)
  form.append('model', 'flux2_klein_9b')
  form.append('width', String(width))
  form.append('height', String(height))
  form.append('num_inference_steps', '8')
  form.append('guidance_scale', '4')
  form.append('seed', String(Math.floor(Math.random() * 2147483647)))
  form.append('response_format', 'url')
  form.append('strength', String(strength))

  await Promise.all(
    referenceImageUrls.map(async (url, i) => {
      const res = await fetch(url)
      const blob = await res.blob()
      form.append('images', blob, `ref_${i}.png`)
    }),
  )

  const res = await ttiClient.post<{ data: Array<{ url: string }> }>('/v1/images/edits', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const outUrl = res.data.data[0].url
  return outUrl.startsWith('http') ? outUrl : `/tti${outUrl}`
}

export async function generateImage(prompt: string, aspect = '1:1'): Promise<string> {
  const { width, height } = getDimensions(aspect)
  const res = await ttiClient.post<{ data: Array<{ url: string }> }>('/v1/images/generations', {
    prompt,
    model: 'flux2_klein_9b',
    width,
    height,
    num_inference_steps: 8,
    guidance_scale: 4,
    seed: Math.floor(Math.random() * 2147483647),
    n: 1,
    response_format: 'url',
    structured_prompt: {},
    caption_upsample: false,
    caption_upsample_temperature: 0.15,
  })
  // The returned URL (e.g. /outputs/xxx.png) is on the TTI server — proxy it too
  const url = res.data.data[0].url
  return url.startsWith('http') ? url : `/tti${url}`
}
