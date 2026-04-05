import { useState } from 'react'
import type { FormState, LlmConfig } from '@/types'
import { defaultFormState, defaultLlmConfig } from '@/types'
import { unloadOllamaModel } from '@/api/llm'
import { unloadTtiModel, unloadVideoModel } from '@/api/tti'
import SettingsPanel from '@/components/SettingsPanel'
import ScriptSection from '@/components/ScriptSection'
import VideoGenerationSection from '@/components/VideoGenerationSection'
import VideoSection from '@/components/VideoSection'
import AudioSection from '@/components/AudioSection'
import SubtitleSection from '@/components/SubtitleSection'
import GenerationPanel from '@/components/GenerationPanel'

export default function Home() {
  const [form, setForm] = useState<FormState>(defaultFormState)
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(defaultLlmConfig)
  const [pexelsKeys, setPexelsKeys] = useState('')
  const [pixabayKeys, setPixabayKeys] = useState('')
  const [unloadingModel, setUnloadingModel] = useState(false)
  const [unloadingTti, setUnloadingTti] = useState(false)
  const [unloadingVideo, setUnloadingVideo] = useState(false)

  async function handleUnloadModel() {
    setUnloadingModel(true)
    try {
      await unloadOllamaModel()
    } finally {
      setUnloadingModel(false)
    }
  }

  async function handleUnloadTti() {
    setUnloadingTti(true)
    try {
      await unloadTtiModel()
    } finally {
      setUnloadingTti(false)
    }
  }

  async function handleUnloadVideo() {
    setUnloadingVideo(true)
    try {
      await unloadVideoModel()
    } finally {
      setUnloadingVideo(false)
    }
  }

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
          <div className="flex items-center gap-4">
            {llmConfig.provider === 'ollama' && (
              <button
                onClick={handleUnloadModel}
                disabled={unloadingModel}
                className="text-xs px-3 py-1.5 rounded border border-[#4a3a2a] bg-[#2a1a0a] text-[#f6ad55] hover:bg-[#3a2a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {unloadingModel ? '⏳ Unloading…' : `⏏ Unload ${llmConfig.model_name || 'Model'}`}
              </button>
            )}
            <button
              onClick={handleUnloadTti}
              disabled={unloadingTti}
              className="text-xs px-3 py-1.5 rounded border border-[#2a3a4a] bg-[#0a1a2a] text-[#63b3ed] hover:bg-[#1a2a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {unloadingTti ? '⏳ Unloading…' : '⏏ Unload Image Model'}
            </button>
            <button
              onClick={handleUnloadVideo}
              disabled={unloadingVideo}
              className="text-xs px-3 py-1.5 rounded border border-[#2a4a3a] bg-[#0a2a1a] text-[#68d391] hover:bg-[#1a3a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {unloadingVideo ? '⏳ Unloading…' : '⏏ Unload Video Model'}
            </button>
            <div className="text-xs text-[#4a5568]">
              API:{' '}
              <span className="text-[#68d391]">http://localhost:8080</span>
            </div>
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

        {/* Row 1: Script (1 col) | Video Generation / Chunks (2 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ScriptSection form={form} onChange={onChange} />
          <div className="lg:col-span-2">
            <VideoGenerationSection form={form} onChange={onChange} />
          </div>
        </div>

        {/* Row 2: Video + Audio (1 col) | Subtitles (2 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-4">
            <VideoSection form={form} onChange={onChange} />
            <AudioSection form={form} onChange={onChange} />
          </div>
          <div className="lg:col-span-2">
            <SubtitleSection form={form} onChange={onChange} />
          </div>
        </div>

        {/* Generation */}
        <div className="border-t border-[#2a3044] pt-4">
          <GenerationPanel form={form} />
        </div>
      </main>
    </div>
  )
}
