import { useState } from 'react'
import type { LlmConfig, LlmProvider } from '@/types'
import { LLM_PROVIDERS, defaultLlmConfig } from '@/types'
import { Card, CardHeader, FormRow, Input, Select, Collapsible, Button } from './ui'

const LLM_MODEL_SUGGESTIONS: Partial<Record<LlmProvider, string[]>> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k'],
  azure: ['gpt-4o', 'gpt-4-turbo'],
  qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
  ollama: ['llama3', 'mistral', 'gemma3:27b', 'qwen2.5'],
  oneapi: ['Qwen/Qwen2.5-72B-Instruct'],
}

const LLM_DEFAULT_BASE_URLS: Partial<Record<LlmProvider, string>> = {
  ollama: 'http://localhost:11434/v1',
  oneapi: 'http://localhost:3000/v1',
}

interface Props {
  llmConfig: LlmConfig
  onLlmChange: (cfg: LlmConfig) => void
  pexelsKeys: string
  pixabayKeys: string
  onPexelsChange: (v: string) => void
  onPixabayChange: (v: string) => void
}

export default function SettingsPanel({
  llmConfig,
  onLlmChange,
  pexelsKeys,
  pixabayKeys,
  onPexelsChange,
  onPixabayChange,
}: Props) {
  const [saved, setSaved] = useState(false)

  function set(key: keyof LlmConfig, value: string) {
    let updated = { ...llmConfig, [key]: value }
    if (key === 'provider') {
      updated = {
        ...defaultLlmConfig,
        provider: value as LlmProvider,
        base_url: LLM_DEFAULT_BASE_URLS[value as LlmProvider] ?? '',
      }
    }
    onLlmChange(updated)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const modelSuggestions = LLM_MODEL_SUGGESTIONS[llmConfig.provider] ?? []

  return (
    <Collapsible title="⚙️ Settings" defaultOpen={false}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* LLM Settings */}
        <Card>
          <CardHeader>LLM Provider</CardHeader>
          <FormRow label="Provider">
            <Select
              value={llmConfig.provider}
              onChange={(e) => set('provider', e.target.value)}
            >
              {LLM_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="API Key">
            <Input
              type="password"
              placeholder={`Enter ${llmConfig.provider} API key`}
              value={llmConfig.api_key}
              onChange={(e) => set('api_key', e.target.value)}
            />
          </FormRow>
          <FormRow label="Base URL (optional)">
            <Input
              placeholder="https://api.openai.com/v1"
              value={llmConfig.base_url}
              onChange={(e) => set('base_url', e.target.value)}
            />
          </FormRow>
          <FormRow label="Model">
            <Input
              placeholder={modelSuggestions[0] ?? 'model name'}
              value={llmConfig.model_name}
              onChange={(e) => set('model_name', e.target.value)}
              list="model-suggestions"
            />
            {modelSuggestions.length > 0 && (
              <datalist id="model-suggestions">
                {modelSuggestions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
          </FormRow>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>Video Source API Keys</CardHeader>
          <FormRow label="Pexels API Keys (one per line)">
            <textarea
              className="w-full bg-[#0f1117] border border-[#2a3044] rounded-md px-3 py-1.5 text-sm text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#4299e1] transition-colors resize-none"
              rows={3}
              placeholder="Enter Pexels API keys..."
              value={pexelsKeys}
              onChange={(e) => onPexelsChange(e.target.value)}
            />
            <a
              href="https://www.pexels.com/api/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#4299e1] hover:underline mt-1 inline-block"
            >
              Get a free Pexels API key →
            </a>
          </FormRow>
          <FormRow label="Pixabay API Keys (one per line)">
            <textarea
              className="w-full bg-[#0f1117] border border-[#2a3044] rounded-md px-3 py-1.5 text-sm text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#4299e1] transition-colors resize-none"
              rows={3}
              placeholder="Enter Pixabay API keys..."
              value={pixabayKeys}
              onChange={(e) => onPixabayChange(e.target.value)}
            />
            <a
              href="https://pixabay.com/api/docs/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#4299e1] hover:underline mt-1 inline-block"
            >
              Get a free Pixabay API key →
            </a>
          </FormRow>
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={handleSave}>
              {saved ? '✓ Saved' : 'Save Keys'}
            </Button>
          </div>
        </Card>
      </div>
    </Collapsible>
  )
}
