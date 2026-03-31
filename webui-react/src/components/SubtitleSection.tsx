import { useQuery } from '@tanstack/react-query'
import type { FormState, SubtitlePosition } from '@/types'
import { getFonts } from '@/api/materials'
import { Card, CardHeader, FormRow, Select, Slider, Checkbox, ColorPicker } from './ui'

const FALLBACK_FONTS = [
  'MicrosoftYaHeiBold.ttc',
  'STHeitiMedium.ttc',
  'NotoSansSC-Regular.otf',
  'Arial.ttf',
]

const POSITIONS: { value: SubtitlePosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'custom', label: 'Custom' },
]

interface Props {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

export default function SubtitleSection({ form, onChange }: Props) {
  const { data: fonts = [] } = useQuery({
    queryKey: ['fonts'],
    queryFn: getFonts,
    retry: false,
    staleTime: 60_000,
  })

  const fontList =
    fonts.length > 0 ? fonts.map((f) => f.name) : FALLBACK_FONTS

  return (
    <Card className="h-full flex flex-col gap-3">
      <CardHeader>💬 Subtitle Settings</CardHeader>

      <Checkbox
        id="subtitle-enabled"
        checked={form.subtitle_enabled ?? true}
        onChange={(v) => onChange({ subtitle_enabled: v })}
        label="Enable Subtitles"
      />

      {form.subtitle_enabled && (
        <>
          <FormRow label="Font">
            <Select
              value={form.font_name ?? fontList[0]}
              onChange={(e) => onChange({ font_name: e.target.value })}
            >
              {fontList.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow label="Position">
            <div className="grid grid-cols-2 gap-1.5">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => onChange({ subtitle_position: p.value })}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    form.subtitle_position === p.value
                      ? 'bg-[#2b4a7e] border-[#4299e1] text-[#63b3ed]'
                      : 'bg-[#0f1117] border-[#2a3044] text-[#9ba3bf] hover:border-[#3a4054]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </FormRow>

          {form.subtitle_position === 'custom' && (
            <FormRow label={`Custom Position: ${form.custom_position ?? 70}%`}>
              <Slider
                min={0}
                max={100}
                step={1}
                value={form.custom_position ?? 70}
                onChange={(v) => onChange({ custom_position: v })}
                label={`${form.custom_position ?? 70}%`}
              />
            </FormRow>
          )}

          <FormRow label="Font Color">
            <ColorPicker
              value={form.text_fore_color ?? '#FFFFFF'}
              onChange={(v) => onChange({ text_fore_color: v })}
            />
          </FormRow>

          <FormRow label={`Font Size: ${form.font_size ?? 60}`}>
            <Slider
              min={30}
              max={100}
              step={2}
              value={form.font_size ?? 60}
              onChange={(v) => onChange({ font_size: v })}
              label={String(form.font_size ?? 60)}
            />
          </FormRow>

          <FormRow label="Stroke Color">
            <ColorPicker
              value={form.stroke_color ?? '#000000'}
              onChange={(v) => onChange({ stroke_color: v })}
            />
          </FormRow>

          <FormRow label={`Stroke Width: ${(form.stroke_width ?? 1.5).toFixed(1)}`}>
            <Slider
              min={0}
              max={10}
              step={0.5}
              value={form.stroke_width ?? 1.5}
              onChange={(v) => onChange({ stroke_width: v })}
              label={String((form.stroke_width ?? 1.5).toFixed(1))}
            />
          </FormRow>
        </>
      )}
    </Card>
  )
}
