import { useState } from 'react'
import type { FormState } from '@/types'
import { VIDEO_LANGUAGES } from '@/types'
import { generateScript, generateTerms } from '@/api/llm'
import { Card, CardHeader, FormRow, Input, Textarea, Select, Button } from './ui'

interface Props {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

export default function ScriptSection({ form, onChange }: Props) {
  const [genScriptLoading, setGenScriptLoading] = useState(false)
  const [genTermsLoading, setGenTermsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerateScript() {
    if (!form.video_subject?.trim()) {
      setError('Please enter a video subject first.')
      return
    }
    setError(null)
    setGenScriptLoading(true)
    try {
      const script = await generateScript({
        video_subject: form.video_subject,
        video_language: form.video_language || undefined,
      })
      onChange({ video_script: script })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenScriptLoading(false)
    }
  }

  async function handleGenerateTerms() {
    if (!form.video_script?.trim()) {
      setError('Please generate or enter a video script first.')
      return
    }
    setError(null)
    setGenTermsLoading(true)
    try {
      const terms = await generateTerms({
        video_subject: form.video_subject ?? '',
        video_script: form.video_script,
      })
      onChange({ video_terms: terms.join(', ') })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenTermsLoading(false)
    }
  }

  return (
    <Card className="h-full flex flex-col gap-3">
      <CardHeader>📝 Video Script</CardHeader>

      <FormRow label="Video Subject" htmlFor="video-subject">
        <Input
          id="video-subject"
          placeholder="e.g. The history of ancient Rome"
          value={form.video_subject ?? ''}
          onChange={(e) => onChange({ video_subject: e.target.value })}
        />
      </FormRow>

      <FormRow label="Script Language" htmlFor="video-language">
        <Select
          id="video-language"
          value={form.video_language ?? ''}
          onChange={(e) => onChange({ video_language: e.target.value })}
        >
          {VIDEO_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </FormRow>

      <Button
        onClick={handleGenerateScript}
        loading={genScriptLoading}
        disabled={!form.video_subject?.trim()}
        className="w-full"
      >
        {genScriptLoading ? 'Generating Script…' : '✨ Generate Script'}
      </Button>

      <FormRow label="Video Script" htmlFor="video-script">
        <Textarea
          id="video-script"
          rows={10}
          placeholder="Your video script will appear here, or type manually…"
          value={form.video_script ?? ''}
          onChange={(e) => onChange({ video_script: e.target.value })}
        />
      </FormRow>

      <Button
        variant="secondary"
        onClick={handleGenerateTerms}
        loading={genTermsLoading}
        disabled={!form.video_script?.trim()}
        className="w-full"
      >
        {genTermsLoading ? 'Generating Keywords…' : '🔍 Generate Keywords'}
      </Button>

      <FormRow label="Video Keywords" htmlFor="video-terms">
        <Textarea
          id="video-terms"
          rows={3}
          placeholder="Keywords for video search (comma-separated)…"
          value={
            Array.isArray(form.video_terms)
              ? form.video_terms.join(', ')
              : (form.video_terms ?? '')
          }
          onChange={(e) => onChange({ video_terms: e.target.value })}
        />
      </FormRow>

      {error && (
        <div className="text-xs text-[#fc8181] bg-[#3a1a1a] border border-[#5a2a2a] rounded p-2">
          {error}
        </div>
      )}
    </Card>
  )
}
