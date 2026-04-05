import { useState } from 'react'
import type { Character, FormState, ScriptChunk } from '@/types'
import { generateScriptChunks, generateCharacters, regenerateVideoPrompt } from '@/api/llm'
import { generateImage, generateImageWithReferences, generateVideo } from '@/api/tti'
import { Card, CardHeader, FormRow, Textarea, Select, Button } from './ui'

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

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
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
  const [genAllChunksImgLoading, setGenAllChunksImgLoading] = useState(false)
  const [genAllVideoPromptsLoading, setGenAllVideoPromptsLoading] = useState(false)
  const [genAllCharsImgLoading, setGenAllCharsImgLoading] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const [charactersChecked, setCharactersChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      .map((name) => form.characters?.find((c) => c.name === name)?.image_url)
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

  async function handleGenerateChunkVideo(index: number) {
    const chunk = form.script_chunks[index]
    if (!chunk?.image_url || !chunk?.video_prompt) return
    setError(null)
    setChunkVideoLoading((prev) => ({ ...prev, [index]: true }))
    try {
      const url = await generateVideo(chunk.video_prompt, chunk.image_url, form.video_aspect)
      const updated = (form.script_chunks ?? []).map((c, i) =>
        i === index ? { ...c, video_url: url } : c
      )
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

  async function handleGenerateChunkImage(index: number) {
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
      const updated = (form.script_chunks ?? []).map((c, i) =>
        i === index ? { ...c, image_url: url } : c
      )
      onChange({ script_chunks: updated })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setChunkImgLoading((prev) => ({ ...prev, [index]: false }))
    }
  }

  async function handleGenerateCharacterImage(index: number) {
    const char = form.characters[index]
    if (!char?.description) return
    setError(null)
    setCharImgLoading((prev) => ({ ...prev, [index]: true }))
    try {
      const prompt = `${char.description}, ${getStylePrompt()}`
      const url = await generateImage(prompt, '1:1')
      const updated = (form.characters ?? []).map((c, i) =>
        i === index ? { ...c, image_url: url } : c
      )
      onChange({ characters: updated })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCharImgLoading((prev) => ({ ...prev, [index]: false }))
    }
  }

  async function handleGenerateAllChunkImages() {
    setError(null)
    setGenAllChunksImgLoading(true)
    const chunks = [...(form.script_chunks ?? [])]
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (!chunks[i].image_prompt || chunks[i].image_url) continue
        const prompt = `${chunks[i].image_prompt}, ${getStylePrompt()}`
        const refs = getChunkReferenceUrls(chunks[i])
        const url = refs.length > 0
          ? await generateImageWithReferences(prompt, refs, form.video_aspect, form.reference_strength ?? 0.4)
          : await generateImage(prompt, form.video_aspect)
        chunks[i] = { ...chunks[i], image_url: url }
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

  async function handleGenerateAllCharacterImages() {
    setError(null)
    setGenAllCharsImgLoading(true)
    const characters = [...(form.characters ?? [])]
    try {
      for (let i = 0; i < characters.length; i++) {
        if (!characters[i].description || characters[i].image_url) continue
        const prompt = `${characters[i].description}, ${getStylePrompt()}`
        const url = await generateImage(prompt, '1:1')
        characters[i] = { ...characters[i], image_url: url }
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
    (form.characters ?? []).length > 0 && (form.characters ?? []).some((c) => !c.image_url)

  return (
    <Card className="h-full flex flex-col gap-3">
      <CardHeader>🎬 Video Generation</CardHeader>

      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
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
      {(form.characters ?? []).some((c) => c.image_url) && (
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
                    <Button
                      variant="secondary"
                      onClick={() => handleGenerateCharacterImage(index)}
                      loading={charImgLoading[index]}
                      disabled={!char.description || charImgLoading[index] || genAllCharsImgLoading}
                      className="w-full mt-1"
                    >
                      {charImgLoading[index] ? 'Generating…' : char.image_url ? '🔄 Regenerate Image' : '🖼 Generate Image'}
                    </Button>
                  </div>

                  {/* Right: thumbnail */}
                  <div className="flex-shrink-0 w-20 flex items-center justify-center">
                    {char.image_url ? (
                      <img
                        src={char.image_url}
                        alt={char.name}
                        className="w-20 h-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ minHeight: '100px', maxHeight: '150px' }}
                        onClick={() => setLightbox({ src: char.image_url!, alt: char.name })}
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

            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {form.script_chunks.map((chunk, index) => (
                <div
                  key={index}
                  className="rounded border border-[#3a3a4a] bg-[#1a1a2e] p-2 flex flex-row gap-2 min-h-[325px]"
                >
                  {/* Left: text + prompt + button */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="text-xs text-[#a0a0b0]">{chunk.text}</p>
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
                      <Button
                        variant="secondary"
                        onClick={() => handleGenerateChunkImage(index)}
                        loading={chunkImgLoading[index]}
                        disabled={!chunk.image_prompt || chunkImgLoading[index] || genAllChunksImgLoading || pendingCharacterImages}
                        className="text-[10px] py-0.5 px-2 h-auto"
                      >
                        {chunkImgLoading[index] ? 'Generating…' : chunk.image_url ? '🔄 Regenerate Image' : '🖼 Generate Image'}
                      </Button>
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
                          disabled={!chunk.video_prompt || !chunk.image_url || chunkVideoLoading[index]}
                          className="text-[10px] py-0.5 px-2 h-auto"
                        >
                          {chunkVideoLoading[index] ? 'Generating…' : chunk.video_url ? '🔄 Regen Video' : '🎬 Generate Video'}
                        </Button>
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
                    {chunk.image_url ? (
                      <img
                        src={chunk.image_url}
                        alt={`Chunk ${index + 1}`}
                        className="w-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ maxHeight: '130px' }}
                        onClick={() => setLightbox({ src: chunk.image_url!, alt: `Chunk ${index + 1}` })}
                      />
                    ) : (
                      <div className="w-full rounded border border-dashed border-[#3a3a4a] flex items-center justify-center text-[#3a3a4a] text-xs text-center" style={{ minHeight: '90px' }}>
                        No image
                      </div>
                    )}
                    {chunk.video_url ? (
                      <video
                        src={chunk.video_url}
                        controls
                        className="w-full rounded"
                        style={{ maxHeight: '130px' }}
                      />
                    ) : chunk.image_url ? (
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
