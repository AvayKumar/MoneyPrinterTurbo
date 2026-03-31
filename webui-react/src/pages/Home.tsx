import { useState } from 'react'
import type { FormState, LlmConfig } from '@/types'
import { defaultFormState, defaultLlmConfig } from '@/types'
import SettingsPanel from '@/components/SettingsPanel'
import ScriptSection from '@/components/ScriptSection'
import VideoSection from '@/components/VideoSection'
import AudioSection from '@/components/AudioSection'
import SubtitleSection from '@/components/SubtitleSection'
import GenerationPanel from '@/components/GenerationPanel'

export default function Home() {
  const [form, setForm] = useState<FormState>(defaultFormState)
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(defaultLlmConfig)
  const [pexelsKeys, setPexelsKeys] = useState('')
  const [pixabayKeys, setPixabayKeys] = useState('')

  function onChange(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e2e8f0]">
      {/* Header */}
      <header className="border-b border-[#2a3044] bg-[#0a0d14] sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎬</span>
            <div>
              <h1 className="text-base font-bold text-[#e2e8f0] leading-none">
                MoneyPrinterTurbo
              </h1>
              <p className="text-xs text-[#4a5568]">AI-powered short video generator</p>
            </div>
          </div>
          <div className="text-xs text-[#4a5568]">
            API:{' '}
            <span className="text-[#68d391]">http://localhost:8080</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
        {/* Settings (collapsible) */}
        <SettingsPanel
          llmConfig={llmConfig}
          onLlmChange={setLlmConfig}
          pexelsKeys={pexelsKeys}
          pixabayKeys={pixabayKeys}
          onPexelsChange={setPexelsKeys}
          onPixabayChange={setPixabayKeys}
        />

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Script */}
          <ScriptSection form={form} onChange={onChange} />

          {/* Center: Video + Audio */}
          <div className="flex flex-col gap-4">
            <VideoSection form={form} onChange={onChange} />
            <AudioSection form={form} onChange={onChange} />
          </div>

          {/* Right: Subtitles */}
          <SubtitleSection form={form} onChange={onChange} />
        </div>

        {/* Generation */}
        <div className="border-t border-[#2a3044] pt-4">
          <GenerationPanel form={form} />
        </div>
      </main>
    </div>
  )
}
