import { useRef } from 'react'
import type { FormState, VideoSource, VideoConcatMode, VideoTransitionMode, VideoAspect } from '@/types'
import { uploadVideoMaterials } from '@/api/videos'
import { Card, CardHeader, FormRow, Select, Slider, Button } from './ui'

const VIDEO_SOURCES: { value: VideoSource; label: string }[] = [
  { value: 'pexels', label: 'Pexels' },
  { value: 'pixabay', label: 'Pixabay' },
  { value: 'local', label: 'Local Files' },
  { value: 'douyin', label: 'TikTok / Douyin' },
  { value: 'bilibili', label: 'Bilibili' },
  { value: 'xiaohongshu', label: 'Xiaohongshu' },
]

const CONCAT_MODES: { value: VideoConcatMode; label: string }[] = [
  { value: 'random', label: 'Random' },
  { value: 'sequential', label: 'Sequential' },
]

const TRANSITION_MODES: { value: VideoTransitionMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'Shuffle', label: 'Shuffle' },
  { value: 'FadeIn', label: 'Fade In' },
  { value: 'FadeOut', label: 'Fade Out' },
  { value: 'SlideIn', label: 'Slide In' },
  { value: 'SlideOut', label: 'Slide Out' },
]

const ASPECT_RATIOS: { value: VideoAspect; label: string; icon: string }[] = [
  { value: '9:16', label: 'Portrait 9:16', icon: '📱' },
  { value: '16:9', label: 'Landscape 16:9', icon: '🖥️' },
  { value: '1:1', label: 'Square 1:1', icon: '⬜' },
]

interface Props {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

export default function VideoSection({ form, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    try {
      await uploadVideoMaterials(files)
    } catch {
      // silently fail — user will see error during generation
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>🎬 Video Settings</CardHeader>

      <FormRow label="Video Source">
        <Select
          value={form.video_source ?? 'pexels'}
          onChange={(e) => onChange({ video_source: e.target.value as VideoSource })}
        >
          {VIDEO_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </FormRow>

      {form.video_source === 'local' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            📁 Upload Local Video Files
          </Button>
        </div>
      )}

      <FormRow label="Concat Mode">
        <Select
          value={form.video_concat_mode ?? 'random'}
          onChange={(e) => onChange({ video_concat_mode: e.target.value as VideoConcatMode })}
        >
          {CONCAT_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </FormRow>

      <FormRow label="Transition">
        <Select
          value={form.video_transition_mode ?? 'none'}
          onChange={(e) =>
            onChange({ video_transition_mode: e.target.value as VideoTransitionMode })
          }
        >
          {TRANSITION_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </FormRow>

      <FormRow label="Aspect Ratio">
        <div className="flex gap-2">
          {ASPECT_RATIOS.map((a) => (
            <button
              key={a.value}
              onClick={() => onChange({ video_aspect: a.value })}
              className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                form.video_aspect === a.value
                  ? 'bg-[#2b4a7e] border-[#4299e1] text-[#63b3ed]'
                  : 'bg-[#0f1117] border-[#2a3044] text-[#9ba3bf] hover:border-[#3a4054]'
              }`}
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </FormRow>

      <FormRow label={`Clip Duration: ${form.video_clip_duration ?? 5}s`}>
        <Slider
          min={2}
          max={10}
          step={1}
          value={form.video_clip_duration ?? 5}
          onChange={(v) => onChange({ video_clip_duration: v })}
          label={`${form.video_clip_duration ?? 5}s`}
        />
      </FormRow>

      <FormRow label={`Number of Videos: ${form.video_count ?? 1}`}>
        <Slider
          min={1}
          max={5}
          step={1}
          value={form.video_count ?? 1}
          onChange={(v) => onChange({ video_count: v })}
          label={String(form.video_count ?? 1)}
        />
      </FormRow>
    </Card>
  )
}
