import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { FormState, TtsServer } from '@/types'
import { getMusics } from '@/api/materials'
import { Card, CardHeader, FormRow, Select, Slider, Button } from './ui'

// Voice lists per TTS server (subset of common voices)
const TTS_VOICES: Record<TtsServer, { value: string; label: string }[]> = {
  'custom-tts': [
    { value: 'en-US-AndrewNeural', label: 'Andrew (en-US)' },
    { value: 'en-US-AriaNeural', label: 'Aria (en-US)' },
    { value: 'en-US-ChristopherNeural', label: 'Christopher (en-US)' },
    { value: 'en-US-EricNeural', label: 'Eric (en-US)' },
    { value: 'en-GB-RyanNeural', label: 'Ryan (en-GB)' },
    { value: 'en-AU-WilliamNeural', label: 'William (en-AU)' },
    { value: 'zh-CN-YunxiNeural', label: 'Yunxi (zh-CN)' },
    { value: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao (zh-CN)' },
    { value: 'ja-JP-KeitaNeural', label: 'Keita (ja-JP)' },
    { value: 'ko-KR-InJoonNeural', label: 'InJoon (ko-KR)' },
  ],
  'azure-v1': [
    { value: 'en-US-JennyNeural', label: 'Jenny (en-US)' },
    { value: 'en-US-GuyNeural', label: 'Guy (en-US)' },
    { value: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao (zh-CN)' },
  ],
  'azure-v2': [
    { value: 'en-US-JennyNeural', label: 'Jenny (en-US)' },
    { value: 'en-US-DavisNeural', label: 'Davis (en-US)' },
    { value: 'zh-CN-XiaoyiNeural', label: 'Xiaoyi (zh-CN)' },
  ],
  siliconflow: [
    { value: 'FishSpeech-1.5', label: 'FishSpeech 1.5' },
    { value: 'CosyVoice2-0.5B', label: 'CosyVoice2 0.5B' },
  ],
  gemini: [
    { value: 'en-US-Standard-A', label: 'Standard A (en-US)' },
    { value: 'en-US-Standard-B', label: 'Standard B (en-US)' },
    { value: 'en-US-Wavenet-D', label: 'WaveNet D (en-US)' },
  ],
}

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

  const { data: musics = [] } = useQuery({
    queryKey: ['musics'],
    queryFn: getMusics,
    retry: false,
    staleTime: 60_000,
  })

  const voices = TTS_VOICES[form.tts_server] ?? TTS_VOICES['custom-tts']

  // Reset voice when TTS server changes
  useEffect(() => {
    const firstVoice = voices[0]?.value ?? ''
    onChange({ voice_name: firstVoice })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tts_server])

  async function handlePreviewVoice() {
    setPreviewLoading(true)
    // Preview uses the browser's built-in speech synthesis as a fallback
    // The actual TTS preview would call the backend
    try {
      const utterance = new SpeechSynthesisUtterance('Hello, this is a voice preview.')
      window.speechSynthesis.speak(utterance)
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
        <div className="flex gap-2">
          <Select
            value={form.voice_name ?? ''}
            onChange={(e) => onChange({ voice_name: e.target.value })}
            className="flex-1"
          >
            {voices.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePreviewVoice}
            loading={previewLoading}
            title="Preview voice"
          >
            ▶
          </Button>
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
