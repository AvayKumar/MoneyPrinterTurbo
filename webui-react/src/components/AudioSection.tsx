import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { FormState, TtsServer } from '@/types'
import { getMusics, getVoices, previewVoice } from '@/api/materials'
import { Card, CardHeader, FormRow, Select, Slider, Button } from './ui'

const TTS_SERVERS: { value: TtsServer; label: string }[] = [
  { value: 'custom-tts', label: 'Custom TTS (Edge TTS)' },
  { value: 'azure-v1', label: 'Azure TTS V1' },
  { value: 'azure-v2', label: 'Azure TTS V2' },
  { value: 'siliconflow', label: 'SiliconFlow' },
  { value: 'gemini', label: 'Gemini TTS' },
]

interface Props {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

export default function AudioSection({ form, onChange }: Props) {
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { data: musics = [] } = useQuery({
    queryKey: ['musics'],
    queryFn: getMusics,
    retry: false,
    staleTime: 60_000,
  })

  const { data: voices = [], isLoading: voicesLoading } = useQuery({
    queryKey: ['voices', form.tts_server],
    queryFn: () => getVoices(form.tts_server),
    staleTime: 60_000,
  })

  // Reset voice when TTS server changes, but only if the current voice isn't in the list
  useEffect(() => {
    if (voices.length > 0) {
      const currentVoiceExists = voices.some((v) => v.value === form.voice_name)
      if (!currentVoiceExists) {
        onChange({ voice_name: voices[0].value })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tts_server, voices])

  async function handlePreviewVoice() {
    if (!form.voice_name) return
    setPreviewLoading(true)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    try {
      const previewText = form.video_subject?.trim() || form.video_script?.trim() || undefined
      const blob = await previewVoice(
        form.voice_name,
        form.voice_rate ?? 1.0,
        form.voice_volume ?? 1.0,
        previewText,
      )
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error('Voice preview failed:', err)
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>🎵 Audio Settings</CardHeader>

      <FormRow label="TTS Server">
        <Select
          value={form.tts_server}
          onChange={(e) => onChange({ tts_server: e.target.value as TtsServer })}
        >
          {TTS_SERVERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </FormRow>

      <FormRow label="Voice">
        <Select
          value={form.voice_name ?? ''}
          onChange={(e) => onChange({ voice_name: e.target.value })}
          disabled={voicesLoading}
        >
          {voicesLoading
            ? <option>Loading…</option>
            : voices.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))
          }
        </Select>
      </FormRow>

      <FormRow label="Preview">
        <div className="flex flex-col gap-2 w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePreviewVoice}
            loading={previewLoading}
            disabled={!form.voice_name || voicesLoading}
          >
            {previewLoading ? 'Generating…' : 'Generate Preview'}
          </Button>
          {previewUrl && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio key={previewUrl} controls autoPlay className="w-full h-8">
              <source src={previewUrl} type="audio/mpeg" />
            </audio>
          )}
        </div>
      </FormRow>

      <FormRow label={`Speech Volume: ${form.voice_volume?.toFixed(1)}`}>
        <Slider
          min={0.6}
          max={5.0}
          step={0.1}
          value={form.voice_volume ?? 1.0}
          onChange={(v) => onChange({ voice_volume: v })}
          label={String(form.voice_volume?.toFixed(1) ?? '1.0')}
        />
      </FormRow>

      <FormRow label={`Speech Rate: ${form.voice_rate?.toFixed(1)}x`}>
        <Slider
          min={0.8}
          max={2.0}
          step={0.1}
          value={form.voice_rate ?? 1.0}
          onChange={(v) => onChange({ voice_rate: v })}
          label={`${form.voice_rate?.toFixed(1) ?? '1.0'}x`}
        />
      </FormRow>

      <FormRow label="Background Music">
        <div className="flex gap-2">
          {(['', 'random', 'custom'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onChange({ bgm_type: t })}
              className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                (form.bgm_type ?? '') === t
                  ? 'bg-[#2b4a7e] border-[#4299e1] text-[#63b3ed]'
                  : 'bg-[#0f1117] border-[#2a3044] text-[#9ba3bf] hover:border-[#3a4054]'
              }`}
            >
              {t === '' ? 'None' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </FormRow>

      {form.bgm_type === 'custom' && musics.length > 0 && (
        <FormRow label="Select BGM File">
          <Select
            value={form.bgm_file ?? ''}
            onChange={(e) => onChange({ bgm_file: e.target.value })}
          >
            <option value="">— Select music file —</option>
            {musics.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </Select>
        </FormRow>
      )}

      {(form.bgm_type === 'random' || form.bgm_type === 'custom') && (
        <FormRow label={`BGM Volume: ${form.bgm_volume?.toFixed(1)}`}>
          <Slider
            min={0.0}
            max={1.0}
            step={0.05}
            value={form.bgm_volume ?? 0.2}
            onChange={(v) => onChange({ bgm_volume: v })}
            label={String(form.bgm_volume?.toFixed(2) ?? '0.20')}
          />
        </FormRow>
      )}
    </Card>
  )
}
