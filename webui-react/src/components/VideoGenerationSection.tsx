import { useState, useEffect } from 'react'
import JSZip from 'jszip'
import type { Character, FormState, ScriptChunk } from '@/types'
import { generateScriptChunks, generateCharacters, regenerateVideoPrompt } from '@/api/llm'
import { generateImage, generateImageWithReferences, generateVideo } from '@/api/tti'
import { generateChunkAudio } from '@/api/audio'
import { Card, CardHeader, FormRow, Textarea, Select, Button } from './ui'
import MediaCarousel from './MediaCarousel'

const IMAGE_STYLES = [
  { label: 'Realistic',              value: 'realistic',   prompt: 'Photorealistic, cinematic quality, natural lighting, high detail photography' },
  { label: 'Pixar 3D Animation',     value: 'pixar',       prompt: 'Pixar-style 3D animation, vibrant colors, expressive characters, soft warm lighting' },
  { label: 'Uncanny Horror',         value: 'horror',      prompt: 'Dark horror animation, unsettling distorted proportions, eerie shadows, visceral atmosphere' },
  { label: 'Studio Ghibli',          value: 'ghibli',      prompt: 'Studio Ghibli hand-drawn animation, lush organic nature, warm soft lighting, painterly detail' },
  { label: 'Cyberpunk Neon',         value: 'cyberpunk',   prompt: 'Cyberpunk aesthetic, neon-lit futuristic city, dark wet streets, electric color contrasts' },
  { label: 'Vintage Film',           value: 'vintage',     prompt: 'Vintage 35mm film look, warm sepia grain, 1970s cinematography, faded nostalgic tones' },
  { label: 'Anime',                  value: 'anime',       prompt: 'Anime illustration style, dynamic composition, bold outlines, vibrant saturated palette' },
  { label: 'Watercolor Art',         value: 'watercolor',  prompt: 'Soft watercolor painting, delicate wet-on-wet brushstrokes, pastel washes, artistic and dreamy' },
  { label: 'Dark Fantasy Epic',      value: 'darkfantasy', prompt: 'Dark fantasy oil painting, dramatic chiaroscuro lighting, mystical atmosphere, intricate detail' },
  { label: 'Minimalist Flat Design', value: 'minimalist',  prompt: 'Minimalist flat design illustration, clean geometric shapes, limited color palette, modern graphic' },
]

interface Props {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

function ImageLightbox({
  urls,
  index,
  alt,
  aspect,
  stylePrompt,
  onClose,
  onIndexChange,
  onAddImage,
}: {
  urls: string[]
  index: number
  alt: string
  aspect: string
  stylePrompt: string
  onClose: () => void
  onIndexChange: (i: number) => void
  onAddImage: (url: string) => void
}) {
  const src = urls[index]
  const hasMultiple = urls.length > 1
  const [editMode, setEditMode] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [editStrength, setEditStrength] = useState(0.7)
  const [editLoading, setEditLoading] = useState(false)

  // Reset edit mode when navigating to a different image
  useEffect(() => {
    setEditMode(false)
    setEditPrompt('')
  }, [index])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editMode) return  // don't navigate while editing
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  onIndexChange((index - 1 + urls.length) % urls.length)
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % urls.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, urls.length, onClose, onIndexChange, editMode])

  async function handleEditGenerate() {
    if (!editPrompt.trim()) return
    setEditLoading(true)
    try {
      const fullPrompt = stylePrompt ? `${editPrompt.trim()}, ${stylePrompt}` : editPrompt.trim()
      const newUrl = await generateImageWithReferences(fullPrompt, [src], aspect, editStrength)
      const newIndex = urls.length  // will be appended at this position
      onAddImage(newUrl)
      onIndexChange(newIndex)
      setEditMode(false)
      setEditPrompt('')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={editMode ? undefined : onClose}
    >
      <div
        className="relative flex flex-col items-center max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="rounded-lg shadow-2xl object-contain max-h-[75vh] max-w-full"
        />

        {/* Edit mode panel */}
        {editMode && (
          <div className="w-full mt-2 bg-[#0a0d14] border border-[#2a3044] rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[#a0a0b0]">Editing reference: <span className="text-[#e2e8f0]">{alt}</span></p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <label className="text-xs text-[#a0a0b0] whitespace-nowrap">Strength:</label>
                <input
                  type="number"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={editStrength}
                  onChange={(e) => setEditStrength(Math.min(1, Math.max(0.1, parseFloat(e.target.value) || 0.7)))}
                  className="w-14 text-xs bg-[#1a1a2e] border border-[#3a3a4a] text-[#e2e8f0] rounded px-2 py-0.5 focus:outline-none focus:border-[#5a6a8a]"
                />
              </div>
            </div>
            <textarea
              autoFocus
              rows={2}
              className="w-full text-xs bg-[#1a1a2e] border border-[#3a3a4a] text-[#e2e8f0] rounded p-2 focus:outline-none focus:border-[#5a6a8a] resize-none"
              placeholder="Describe the changes… (e.g. make it night time, add fog)"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleEditGenerate() }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleEditGenerate}
                disabled={!editPrompt.trim() || editLoading}
                className="flex-1 text-xs px-3 py-1.5 rounded bg-[#3a5a8a] text-white hover:bg-[#4a6a9a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editLoading ? '⏳ Generating…' : '✨ Generate Edit'}
              </button>
              <button
                onClick={() => { setEditMode(false); setEditPrompt('') }}
                disabled={editLoading}
                className="text-xs px-3 py-1.5 rounded border border-[#3a3a4a] text-[#a0a0b0] hover:bg-[#1a1a2e] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prev / Next — hidden in edit mode */}
      {hasMultiple && !editMode && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition-colors"
            onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + urls.length) % urls.length) }}
          >
            ‹
          </button>
          <button
            className="absolute right-14 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition-colors"
            onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % urls.length) }}
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {index + 1} / {urls.length}
          </div>
        </>
      )}

      {/* Edit icon — top-left */}
      {!editMode && (
        <button
          className="absolute top-4 left-4 bg-white rounded-full w-9 h-9 flex items-center justify-center text-base transition-all shadow hover:scale-110 hover:shadow-lg"
          title="Edit image"
          onClick={(e) => { e.stopPropagation(); setEditMode(true) }}
        >
          ✏️
        </button>
      )}

      {/* Close — top-right */}
      <button
        className="absolute top-4 right-4 text-white text-2xl leading-none bg-black/50 rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/80"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  )
}

export default function VideoGenerationSection({ form, onChange }: Props) {
  const [genChunksLoading, setGenChunksLoading] = useState(false)
  const [genCharactersLoading, setGenCharactersLoading] = useState(false)
  const [chunkImgLoading, setChunkImgLoading] = useState<Record<number, boolean>>({})
  const [chunkVideoLoading, setChunkVideoLoading] = useState<Record<number, boolean>>({})
  const [chunkVideoPromptLoading, setChunkVideoPromptLoading] = useState<Record<number, boolean>>({})
  const [charImgLoading, setCharImgLoading] = useState<Record<number, boolean>>({})
  const [chunkAudioLoading, setChunkAudioLoading] = useState<Record<number, boolean>>({})
  const [genAllChunksImgLoading, setGenAllChunksImgLoading] = useState(false)
  const [genAllVideoPromptsLoading, setGenAllVideoPromptsLoading] = useState(false)
  const [genAllAudioLoading, setGenAllAudioLoading] = useState(false)
  const [genAllCharsImgLoading, setGenAllCharsImgLoading] = useState(false)
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number; alt: string; aspect: string; stylePrompt: string; onAddImage: (url: string) => void } | null>(null)
  const [charactersChecked, setCharactersChecked] = useState(
    () => (form.characters?.length ?? 0) > 0 || (form.script_chunks?.length ?? 0) > 0,
  )
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  // Derive charactersChecked when form data changes (e.g. session restore)
  useEffect(() => {
    if ((form.characters?.length ?? 0) > 0 || (form.script_chunks?.length ?? 0) > 0) {
      setCharactersChecked(true)
    }
  }, [form.characters, form.script_chunks])

  // Download is enabled when all chunks have a video AND narration audio exists
  const allChunksHaveVideo =
    (form.script_chunks?.length ?? 0) > 0 &&
    (form.script_chunks ?? []).every((c) => (c.video_urls?.length ?? 0) > 0)
  const downloadEnabled = allChunksHaveVideo && !!form.narration_audio_url

  async function handleDownload() {
    if (!downloadEnabled) return
    setDownloading(true)
    setError(null)
    try {
      const zip = new JSZip()
      const subject = (form.video_subject?.trim() || 'project').replace(/[^a-z0-9]/gi, '_').toLowerCase()

      // Add narration audio
      const audioRes = await fetch(form.narration_audio_url!)
      if (!audioRes.ok) throw new Error(`Failed to fetch narration audio: ${audioRes.status}`)
      const audioBlob = await audioRes.blob()
      const audioExt = form.narration_audio_url!.split('.').pop()?.split('?')[0] || 'mp3'
      zip.file(`narration_audio.${audioExt}`, audioBlob)

      // Add chunk videos (selected index, zero-padded sequence number)
      const chunks = form.script_chunks ?? []
      const pad = String(chunks.length).length
      await Promise.all(
        chunks.map(async (chunk, i) => {
          const videoIndex = chunk.video_index ?? 0
          const videoUrl = chunk.video_urls![videoIndex]
          const videoRes = await fetch(videoUrl)
          if (!videoRes.ok) throw new Error(`Failed to fetch video for chunk ${i + 1}: ${videoRes.status}`)
          const videoBlob = await videoRes.blob()
          const videoExt = videoUrl.split('.').pop()?.split('?')[0] || 'mp4'
          const seq = String(i + 1).padStart(pad, '0')
          zip.file(`chunk_${seq}.${videoExt}`, videoBlob)
        }),
      )

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(zipBlob)
      a.download = `${subject}_chunks.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      setError(`Download failed: ${(e as Error).message}`)
    } finally {
      setDownloading(false)
    }
  }

  function getStylePrompt(): string {
    return IMAGE_STYLES.find((s) => s.value === form.image_style)?.prompt ?? ''
  }

  function getChunkReferenceUrls(chunk: ScriptChunk): string[] {
    const names = [...(chunk.character_names ?? [])].sort((a, b) => {
      // Lead character always goes first
      if (a.includes('(Lead)')) return -1
      if (b.includes('(Lead)')) return 1
      return 0
    })
    return names
      .map((name) => {
        const char = form.characters?.find((c) => c.name === name)
        return char?.image_urls?.[char.image_index ?? 0]
      })
      .filter((url): url is string => Boolean(url))
  }

  async function handleGenerateChunks() {
    if (!form.video_script?.trim()) {
      setError('Please generate or enter a video script first.')
      return
    }
    setError(null)
    setGenChunksLoading(true)
    try {
      const chunks = await generateScriptChunks({
        video_script: form.video_script,
        language: form.video_language || undefined,
        image_style_prompt: getStylePrompt(),
        character_names: (form.characters ?? []).map((c) => c.name).filter(Boolean),
      })
      onChange({ script_chunks: chunks })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenChunksLoading(false)
    }
  }

  async function handleGenerateCharacters() {
    if (!form.video_script?.trim()) {
      setError('Please generate or enter a video script first.')
      return
    }
    setError(null)
    setGenCharactersLoading(true)
    try {
      const characters = await generateCharacters({
        video_script: form.video_script,
        image_style_prompt: getStylePrompt(),
      })
      onChange({ characters })
      setCharactersChecked(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenCharactersLoading(false)
    }
  }

  function handleCharacterChange(index: number, field: keyof Character, value: string) {
    const updated: Character[] = (form.characters ?? []).map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    )
    onChange({ characters: updated })
  }

  function handleChunkPromptChange(index: number, newPrompt: string) {
    const updated: ScriptChunk[] = (form.script_chunks ?? []).map((c, i) =>
      i === index ? { ...c, image_prompt: newPrompt } : c
    )
    onChange({ script_chunks: updated })
  }

  function handleChunkVideoPromptChange(index: number, newPrompt: string) {
    const updated: ScriptChunk[] = (form.script_chunks ?? []).map((c, i) =>
      i === index ? { ...c, video_prompt: newPrompt } : c
    )
    onChange({ script_chunks: updated })
  }

  async function handleGenerateChunkVideo(index: number, regenerate = false) {
    const chunk = form.script_chunks[index]
    const imageUrl = chunk?.image_urls?.[chunk.image_index ?? 0]
    if (!imageUrl || !chunk?.video_prompt) return
    setError(null)
    setChunkVideoLoading((prev) => ({ ...prev, [index]: true }))
    try {
      const duration = chunk.audio_duration != null ? Math.ceil(chunk.audio_duration) + 1 : 4.0
      const url = await generateVideo(chunk.video_prompt, imageUrl, form.video_aspect, duration)
      const updated = (form.script_chunks ?? []).map((c, i) => {
        if (i !== index) return c
        const existing = regenerate ? [] : (c.video_urls ?? [])
        const video_urls = [...existing, url]
        return { ...c, video_urls, video_index: video_urls.length - 1 }
      })
      onChange({ script_chunks: updated })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setChunkVideoLoading((prev) => ({ ...prev, [index]: false }))
    }
  }

  async function handleRegenerateVideoPrompt(index: number) {
    const chunk = form.script_chunks[index]
    if (!chunk?.image_prompt) return
    setError(null)
    setChunkVideoPromptLoading((prev) => ({ ...prev, [index]: true }))
    try {
      const video_prompt = await regenerateVideoPrompt({
        chunk_text: chunk.text,
        image_prompt: chunk.image_prompt,
        character_names: chunk.character_names,
      })
      const updated = (form.script_chunks ?? []).map((c, i) =>
        i === index ? { ...c, video_prompt } : c
      )
      onChange({ script_chunks: updated })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setChunkVideoPromptLoading((prev) => ({ ...prev, [index]: false }))
    }
  }

  function handleChunkAddCharacter(chunkIndex: number, name: string) {
    if (!name) return
    const updated = (form.script_chunks ?? []).map((c, i) => {
      if (i !== chunkIndex) return c
      const existing = c.character_names ?? []
      if (existing.includes(name)) return c
      return { ...c, character_names: [...existing, name] }
    })
    onChange({ script_chunks: updated })
  }

  function handleChunkRemoveCharacter(chunkIndex: number, name: string) {
    const updated = (form.script_chunks ?? []).map((c, i) =>
      i === chunkIndex
        ? { ...c, character_names: (c.character_names ?? []).filter((n) => n !== name) }
        : c
    )
    onChange({ script_chunks: updated })
  }

  async function handleGenerateChunkImage(index: number, regenerate = false) {
    const chunk = form.script_chunks[index]
    if (!chunk?.image_prompt) return
    setError(null)
    setChunkImgLoading((prev) => ({ ...prev, [index]: true }))
    try {
      const prompt = `${chunk.image_prompt}, ${getStylePrompt()}`
      const refs = getChunkReferenceUrls(chunk)
      const url = refs.length > 0
        ? await generateImageWithReferences(prompt, refs, form.video_aspect, form.reference_strength ?? 0.4)
        : await generateImage(prompt, form.video_aspect)
      const updated = (form.script_chunks ?? []).map((c, i) => {
        if (i !== index) return c
        const existing = regenerate ? [] : (c.image_urls ?? [])
        const image_urls = [...existing, url]
        return { ...c, image_urls, image_index: image_urls.length - 1 }
      })
      onChange({ script_chunks: updated })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setChunkImgLoading((prev) => ({ ...prev, [index]: false }))
    }
  }

  function handleChunkMediaIndexChange(chunkIndex: number, field: 'image_index' | 'video_index', value: number) {
    const updated = (form.script_chunks ?? []).map((c, i) =>
      i === chunkIndex ? { ...c, [field]: value } : c
    )
    onChange({ script_chunks: updated })
  }

  async function handleGenerateCharacterImage(index: number, regenerate = false) {
    const char = form.characters[index]
    if (!char?.description) return
    setError(null)
    setCharImgLoading((prev) => ({ ...prev, [index]: true }))
    try {
      const prompt = `${char.description}, ${getStylePrompt()}`
      const url = await generateImage(prompt, '1:1')
      const updated = (form.characters ?? []).map((c, i) => {
        if (i !== index) return c
        const existing = regenerate ? [] : (c.image_urls ?? [])
        const image_urls = [...existing, url]
        return { ...c, image_urls, image_index: image_urls.length - 1 }
      })
      onChange({ characters: updated })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCharImgLoading((prev) => ({ ...prev, [index]: false }))
    }
  }

  function handleCharMediaIndexChange(charIndex: number, value: number) {
    const updated = (form.characters ?? []).map((c, i) =>
      i === charIndex ? { ...c, image_index: value } : c
    )
    onChange({ characters: updated })
  }

  async function handleGenerateAllChunkImages() {
    setError(null)
    setGenAllChunksImgLoading(true)
    const chunks = [...(form.script_chunks ?? [])]
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (!chunks[i].image_prompt || (chunks[i].image_urls?.length ?? 0) > 0) continue
        const prompt = `${chunks[i].image_prompt}, ${getStylePrompt()}`
        const refs = getChunkReferenceUrls(chunks[i])
        const url = refs.length > 0
          ? await generateImageWithReferences(prompt, refs, form.video_aspect, form.reference_strength ?? 0.4)
          : await generateImage(prompt, form.video_aspect)
        chunks[i] = { ...chunks[i], image_urls: [url], image_index: 0 }
        onChange({ script_chunks: [...chunks] })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenAllChunksImgLoading(false)
    }
  }

  async function handleGenerateAllVideoPrompts() {
    setError(null)
    setGenAllVideoPromptsLoading(true)
    const chunks = [...(form.script_chunks ?? [])]
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (!chunks[i].image_prompt) continue
        const video_prompt = await regenerateVideoPrompt({
          chunk_text: chunks[i].text,
          image_prompt: chunks[i].image_prompt,
          character_names: chunks[i].character_names,
        })
        chunks[i] = { ...chunks[i], video_prompt }
        onChange({ script_chunks: [...chunks] })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenAllVideoPromptsLoading(false)
    }
  }

  async function handleGenerateChunkAudio(index: number) {
    const chunk = form.script_chunks[index]
    if (!chunk?.text) return
    setChunkAudioLoading((prev) => ({ ...prev, [index]: true }))
    try {
      const result = await generateChunkAudio({
        text: chunk.text,
        voice_name: form.voice_name ?? '',
        voice_rate: form.voice_rate,
        voice_volume: form.voice_volume,
      })
      const updated = (form.script_chunks ?? []).map((c, i) =>
        i === index ? { ...c, audio_url: result.audio_url, audio_duration: result.duration } : c
      )
      onChange({ script_chunks: updated })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setChunkAudioLoading((prev) => ({ ...prev, [index]: false }))
    }
  }

  async function handleGenerateAllAudio() {
    setGenAllAudioLoading(true)
    const chunks = [...(form.script_chunks ?? [])]
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].audio_url) continue
      setChunkAudioLoading((prev) => ({ ...prev, [i]: true }))
      try {
        const result = await generateChunkAudio({
          text: chunks[i].text,
          voice_name: form.voice_name ?? '',
          voice_rate: form.voice_rate,
          voice_volume: form.voice_volume,
        })
        chunks[i] = { ...chunks[i], audio_url: result.audio_url, audio_duration: result.duration }
        onChange({ script_chunks: [...chunks] })
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setChunkAudioLoading((prev) => ({ ...prev, [i]: false }))
      }
    }
    setGenAllAudioLoading(false)
  }

  async function handleGenerateAllCharacterImages() {
    setError(null)
    setGenAllCharsImgLoading(true)
    const characters = [...(form.characters ?? [])]
    try {
      for (let i = 0; i < characters.length; i++) {
        if (!characters[i].description || (characters[i].image_urls?.length ?? 0) > 0) continue
        const prompt = `${characters[i].description}, ${getStylePrompt()}`
        const url = await generateImage(prompt, '1:1')
        characters[i] = { ...characters[i], image_urls: [url], image_index: 0 }
        onChange({ characters: [...characters] })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenAllCharsImgLoading(false)
    }
  }

  const anyChunkImgLoading = Object.values(chunkImgLoading).some(Boolean)
  const anyCharImgLoading = Object.values(charImgLoading).some(Boolean)
  const pendingCharacterImages =
    (form.characters ?? []).length > 0 && (form.characters ?? []).some((c) => !c.image_urls?.length)

  return (
    <Card className="h-full flex flex-col gap-3">
      <CardHeader>🎬 Video Generation</CardHeader>

      {lightbox && (
        <ImageLightbox
          urls={lightbox.urls}
          index={lightbox.index}
          alt={lightbox.alt}
          aspect={lightbox.aspect}
          stylePrompt={lightbox.stylePrompt}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => setLightbox((prev) => prev ? { ...prev, index: i } : null)}
          onAddImage={lightbox.onAddImage}
        />
      )}

      <FormRow label="Image Style" htmlFor="image-style">
        <Select
          id="image-style"
          value={form.image_style ?? 'realistic'}
          onChange={(e) => onChange({ image_style: e.target.value })}
        >
          {IMAGE_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </FormRow>

      {/* Reference strength — only shown once characters have images */}
      {(form.characters ?? []).some((c) => c.image_urls?.length) && (
        <FormRow label={`Character Reference Strength: ${(form.reference_strength ?? 0.4).toFixed(2)}`} htmlFor="ref-strength">
          <input
            id="ref-strength"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={form.reference_strength ?? 0.4}
            onChange={(e) => onChange({ reference_strength: parseFloat(e.target.value) })}
            className="w-full accent-[#63b3ed]"
          />
        </FormRow>
      )}

      {/* ── Characters (must come first) ── */}
      <div className="border-b border-[#2a3044] pb-3">
        <p className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wide mb-2">
          👤 Main Characters
        </p>

        <Button
          variant="secondary"
          onClick={handleGenerateCharacters}
          loading={genCharactersLoading}
          disabled={!form.video_script?.trim()}
          className="w-full mb-2"
        >
          {genCharactersLoading ? 'Generating Characters…' : '🎭 Generate Characters'}
        </Button>

        {form.characters && form.characters.length > 0 && (
          <>
            <Button
              variant="secondary"
              onClick={handleGenerateAllCharacterImages}
              loading={genAllCharsImgLoading}
              disabled={genAllCharsImgLoading || anyCharImgLoading}
              className="w-full mb-2"
            >
              {genAllCharsImgLoading ? 'Generating All Character Images…' : '🖼 Generate All Character Images'}
            </Button>

            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '40vh' }}>
              {form.characters.map((char, index) => (
                <div
                  key={index}
                  className="rounded border border-[#3a3a4a] bg-[#1a1a2e] p-2 flex flex-row gap-2 min-h-[165px]"
                >
                  {/* Left: name + description + button */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <input
                      className="text-xs font-semibold text-[#e2e8f0] bg-transparent border-b border-[#3a3a4a] pb-1 mb-1 focus:outline-none focus:border-[#5a6a8a]"
                      value={char.name}
                      placeholder="Character name…"
                      onChange={(e) => handleCharacterChange(index, 'name', e.target.value)}
                    />
                    <Textarea
                      rows={3}
                      placeholder="Character description for reference image…"
                      value={char.description}
                      onChange={(e) => handleCharacterChange(index, 'description', e.target.value)}
                    />
                    <div className="flex gap-1 mt-1">
                      <Button
                        variant="secondary"
                        onClick={() => handleGenerateCharacterImage(index)}
                        loading={charImgLoading[index]}
                        disabled={!char.description || charImgLoading[index] || genAllCharsImgLoading}
                        className="flex-1"
                      >
                        {charImgLoading[index] ? 'Generating…' : (char.image_urls?.length ?? 0) > 0 ? '🖼 Add Image' : '🖼 Generate Image'}
                      </Button>
                      {(char.image_urls?.length ?? 0) > 0 && (
                        <Button
                          variant="secondary"
                          onClick={() => handleGenerateCharacterImage(index, true)}
                          loading={charImgLoading[index]}
                          disabled={charImgLoading[index] || genAllCharsImgLoading}
                          className="px-2"
                          title="Clear all and regenerate"
                        >
                          🔄
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right: thumbnail */}
                  <div className="flex-shrink-0 w-20 flex items-center justify-center">
                    {(char.image_urls?.length ?? 0) > 0 ? (
                      <MediaCarousel
                        type="image"
                        urls={char.image_urls!}
                        index={char.image_index ?? 0}
                        onIndexChange={(i) => handleCharMediaIndexChange(index, i)}
                        style={{ maxHeight: '150px', minHeight: '100px' }}
                        onLightboxOpen={(urls, i) => setLightbox({
                          urls, index: i, alt: char.name, aspect: '1:1', stylePrompt: getStylePrompt(),
                          onAddImage: (url) => {
                            const charIdx = index
                            const updated = (form.characters ?? []).map((c, ci) =>
                              ci !== charIdx ? c : { ...c, image_urls: [...(c.image_urls ?? []), url], image_index: (c.image_urls ?? []).length }
                            )
                            onChange({ characters: updated })
                          },
                        })}
                        alt={char.name}
                      />
                    ) : (
                      <div className="w-20 rounded border border-dashed border-[#3a3a4a] flex items-center justify-center text-[#3a3a4a] text-xs text-center" style={{ minHeight: '100px' }}>
                        No image
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Script Chunks (requires characters first) ── */}
      <div className="flex flex-col gap-2">
        {!charactersChecked && form.video_script?.trim() && (
          <div className="text-xs text-[#f6ad55] bg-[#2a1a0a] border border-[#4a3a2a] rounded p-2">
            ⚠️ Generate characters first before splitting the script into chunks.
          </div>
        )}

        {charactersChecked && form.characters?.length === 0 && (
          <div className="text-xs text-[#68d391] bg-[#0a2a1a] border border-[#1a4a2a] rounded p-2">
            ℹ️ No main characters found — proceeding without character references.
          </div>
        )}

        <Button
          onClick={handleGenerateChunks}
          loading={genChunksLoading}
          disabled={!form.video_script?.trim() || !charactersChecked}
          className="w-full"
        >
          {genChunksLoading ? 'Generating Chunks…' : '✂️ Generate Script Chunks'}
        </Button>

        {form.script_chunks && form.script_chunks.length > 0 && (
          <>
            <Button
              variant="secondary"
              onClick={handleGenerateAllChunkImages}
              loading={genAllChunksImgLoading}
              disabled={genAllChunksImgLoading || anyChunkImgLoading || pendingCharacterImages}
              className="w-full"
            >
              {genAllChunksImgLoading ? 'Generating All Chunk Images…' : '🖼 Generate All Chunk Images'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleGenerateAllVideoPrompts}
              loading={genAllVideoPromptsLoading}
              disabled={genAllVideoPromptsLoading}
              className="w-full"
            >
              {genAllVideoPromptsLoading ? 'Generating All Video Prompts…' : '🎬 Generate All Video Prompts'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleGenerateAllAudio}
              loading={genAllAudioLoading}
              disabled={genAllAudioLoading || !form.voice_name || form.script_chunks.length === 0}
              className="w-full"
            >
              {genAllAudioLoading ? 'Generating All Audio…' : '🔊 Generate All Audio'}
            </Button>
            <Button
              variant={downloadEnabled ? 'primary' : 'secondary'}
              onClick={handleDownload}
              loading={downloading}
              disabled={!downloadEnabled || downloading}
              className="w-full"
              title={
                !allChunksHaveVideo
                  ? 'Generate videos for all chunks first'
                  : !form.narration_audio_url
                  ? 'Generate narration audio first (in Script section)'
                  : 'Download narration audio + chunk videos as ZIP'
              }
            >
              {downloading ? '⏳ Zipping…' : '⬇ Download Chunks ZIP'}
            </Button>

            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {form.script_chunks.map((chunk, index) => (
                <div
                  key={index}
                  className="rounded border border-[#3a3a4a] bg-[#1a1a2e] p-2 flex flex-row gap-2 min-h-[325px]"
                >
                  {/* Left: text + prompt + button */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="text-xs text-[#a0a0b0]">{chunk.text}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="secondary"
                        onClick={() => handleGenerateChunkAudio(index)}
                        loading={chunkAudioLoading[index]}
                        disabled={chunkAudioLoading[index] || genAllAudioLoading}
                        className="text-[10px] py-0.5 px-2 h-auto"
                      >
                        {chunkAudioLoading[index] ? 'Generating…' : chunk.audio_url ? '🔄 Regen Audio' : '🔊 Audio'}
                      </Button>
                      {chunk.audio_url && (
                        <>
                          <audio src={chunk.audio_url} controls className="h-6 max-w-[160px]" />
                          <span className="text-[10px] text-[#a0a0b0] whitespace-nowrap">
                            {chunk.audio_duration?.toFixed(1)}s
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {(chunk.character_names ?? []).map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 text-xs bg-[#1a2a3a] border border-[#2a4a6a] text-[#63b3ed] rounded px-1.5 py-0.5"
                        >
                          👤 {name}
                          <button
                            onClick={() => handleChunkRemoveCharacter(index, name)}
                            className="text-[#fc8181] hover:text-[#feb2b2] leading-none"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      {(() => {
                        const available = (form.characters ?? [])
                          .map((c) => c.name)
                          .filter((n) => n && !(chunk.character_names ?? []).includes(n))
                        return available.length > 0 ? (
                          <select
                            className="text-xs bg-[#1a1a2e] border border-dashed border-[#3a3a4a] text-[#a0a0b0] rounded px-1 py-0.5 cursor-pointer"
                            value=""
                            onChange={(e) => handleChunkAddCharacter(index, e.target.value)}
                          >
                            <option value="" disabled>+ add</option>
                            {available.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        ) : null
                      })()}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-[#606070] uppercase tracking-wide">Image Prompt</p>
                      <div className="flex gap-1">
                        <Button
                          variant="secondary"
                          onClick={() => handleGenerateChunkImage(index)}
                          loading={chunkImgLoading[index]}
                          disabled={!chunk.image_prompt || chunkImgLoading[index] || genAllChunksImgLoading || pendingCharacterImages}
                          className="text-[10px] py-0.5 px-2 h-auto"
                        >
                          {chunkImgLoading[index] ? 'Generating…' : (chunk.image_urls?.length ?? 0) > 0 ? '🖼 Add Image' : '🖼 Generate Image'}
                        </Button>
                        {(chunk.image_urls?.length ?? 0) > 0 && (
                          <Button
                            variant="secondary"
                            onClick={() => handleGenerateChunkImage(index, true)}
                            loading={chunkImgLoading[index]}
                            disabled={chunkImgLoading[index] || genAllChunksImgLoading || pendingCharacterImages}
                            className="text-[10px] py-0.5 px-2 h-auto"
                            title="Clear all and regenerate"
                          >
                            🔄
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="Image prompt…"
                      value={chunk.image_prompt}
                      onChange={(e) => handleChunkPromptChange(index, e.target.value)}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-[#606070] uppercase tracking-wide">Video Prompt</p>
                      <div className="flex gap-1">
                        <Button
                          variant="secondary"
                          onClick={() => handleRegenerateVideoPrompt(index)}
                          loading={chunkVideoPromptLoading[index]}
                          disabled={!chunk.image_prompt || chunkVideoPromptLoading[index]}
                          className="text-[10px] py-0.5 px-2 h-auto"
                        >
                          {chunkVideoPromptLoading[index] ? 'Regenerating…' : '🔄 Regenerate'}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleGenerateChunkVideo(index)}
                          loading={chunkVideoLoading[index]}
                          disabled={!chunk.video_prompt || !(chunk.image_urls?.length) || !chunk.audio_url || chunkVideoLoading[index]}
                          className="text-[10px] py-0.5 px-2 h-auto"
                          title={!chunk.audio_url ? 'Generate audio for this chunk first' : undefined}
                        >
                          {chunkVideoLoading[index] ? 'Generating…' : (chunk.video_urls?.length ?? 0) > 0 ? '🎬 Add Video' : '🎬 Generate Video'}
                        </Button>
                        {(chunk.video_urls?.length ?? 0) > 0 && (
                          <Button
                            variant="secondary"
                            onClick={() => handleGenerateChunkVideo(index, true)}
                            loading={chunkVideoLoading[index]}
                            disabled={!chunk.video_prompt || !(chunk.image_urls?.length) || !chunk.audio_url || chunkVideoLoading[index]}
                            className="text-[10px] py-0.5 px-2 h-auto"
                            title="Clear all and regenerate"
                          >
                            🔄
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="Video animation prompt…"
                      value={chunk.video_prompt ?? ''}
                      onChange={(e) => handleChunkVideoPromptChange(index, e.target.value)}
                    />
                  </div>

                  {/* Right: image + video stacked */}
                  <div className="flex-shrink-0 w-40 flex flex-col gap-2 items-center justify-start">
                    {(chunk.image_urls?.length ?? 0) > 0 ? (
                      <MediaCarousel
                        type="image"
                        urls={chunk.image_urls!}
                        index={chunk.image_index ?? 0}
                        onIndexChange={(i) => handleChunkMediaIndexChange(index, 'image_index', i)}
                        style={{ maxHeight: '130px' }}
                        onLightboxOpen={(urls, i) => setLightbox({
                          urls, index: i, alt: `Chunk ${index + 1}`, aspect: form.video_aspect ?? '9:16', stylePrompt: getStylePrompt(),
                          onAddImage: (url) => {
                            const chunkIdx = index
                            const updated = (form.script_chunks ?? []).map((c, ci) =>
                              ci !== chunkIdx ? c : { ...c, image_urls: [...(c.image_urls ?? []), url], image_index: (c.image_urls ?? []).length }
                            )
                            onChange({ script_chunks: updated })
                          },
                        })}
                        alt={`Chunk ${index + 1}`}
                      />
                    ) : (
                      <div className="w-full rounded border border-dashed border-[#3a3a4a] flex items-center justify-center text-[#3a3a4a] text-xs text-center" style={{ minHeight: '90px' }}>
                        No image
                      </div>
                    )}
                    {(chunk.video_urls?.length ?? 0) > 0 ? (
                      <MediaCarousel
                        type="video"
                        urls={chunk.video_urls!}
                        index={chunk.video_index ?? 0}
                        onIndexChange={(i) => handleChunkMediaIndexChange(index, 'video_index', i)}
                        style={{ maxHeight: '130px' }}
                      />
                    ) : (chunk.image_urls?.length ?? 0) > 0 ? (
                      <div className="w-full rounded border border-dashed border-[#3a3a4a] flex items-center justify-center text-[#3a3a4a] text-xs text-center" style={{ minHeight: '60px' }}>
                        No video
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="text-xs text-[#fc8181] bg-[#3a1a1a] border border-[#5a2a2a] rounded p-2">
          {error}
        </div>
      )}
    </Card>
  )
}
