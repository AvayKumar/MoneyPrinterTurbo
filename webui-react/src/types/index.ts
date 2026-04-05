// ─── Enums / Literals ────────────────────────────────────────────────────────

export type VideoAspect = '9:16' | '16:9' | '1:1'
export type VideoConcatMode = 'sequential' | 'random'
export type VideoTransitionMode =
  | 'none'
  | 'Shuffle'
  | 'FadeIn'
  | 'FadeOut'
  | 'SlideIn'
  | 'SlideOut'
export type VideoSource =
  | 'pexels'
  | 'pixabay'
  | 'local'
  | 'douyin'
  | 'bilibili'
  | 'xiaohongshu'
export type SubtitlePosition = 'top' | 'center' | 'bottom' | 'custom'
export type BgmType = 'random' | 'custom' | ''
export type TtsServer = 'custom-tts' | 'azure-v1' | 'azure-v2' | 'siliconflow' | 'gemini'
export type TaskState = 0 | 1 | 2 | 3 // pending | processing | complete | failed

// ─── Request Models ───────────────────────────────────────────────────────────

export interface VideoMaterial {
  provider: string
  url: string
  duration: number
}

export interface TaskVideoRequest {
  video_subject: string
  video_script?: string
  video_terms?: string | string[]
  video_aspect?: VideoAspect
  video_concat_mode?: VideoConcatMode
  video_transition_mode?: VideoTransitionMode
  video_clip_duration?: number
  video_count?: number
  video_source?: VideoSource
  video_materials?: VideoMaterial[]
  custom_audio_file?: string
  video_language?: string
  voice_name?: string
  voice_volume?: number
  voice_rate?: number
  bgm_type?: BgmType
  bgm_file?: string
  bgm_volume?: number
  subtitle_enabled?: boolean
  subtitle_position?: SubtitlePosition
  custom_position?: number
  font_name?: string
  text_fore_color?: string
  font_size?: number
  stroke_color?: string
  stroke_width?: number
  n_threads?: number
  paragraph_number?: number
}

export interface VideoScriptRequest {
  video_subject: string
  video_language?: string
  paragraph_number?: number
}

export interface VideoTermsRequest {
  video_subject: string
  video_script: string
  amount?: number
}

export interface ScriptChunk {
  text: string
  image_prompt: string
  video_prompt?: string
  character_names?: string[]
  image_url?: string
  video_url?: string
}

export interface ScriptChunksRequest {
  video_script: string
  language?: string
  image_style_prompt?: string
  character_names?: string[]
}

export interface VideoPromptRequest {
  chunk_text: string
  image_prompt: string
  character_names?: string[]
}

export interface Character {
  name: string
  description: string
  image_url?: string
}

export interface CharactersRequest {
  video_script: string
  image_style_prompt?: string
}

export interface SubtitleRequest extends TaskVideoRequest {
  video_script: string
}

// ─── Response Models ──────────────────────────────────────────────────────────

export interface TaskData {
  task_id: string
  state: TaskState
  progress: number
  videos?: string[]
  combined_videos?: string[]
  error?: string
  logs?: string[]
}

export interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

export interface TaskResponse extends ApiResponse<{ task_id: string }> {}

export interface TaskQueryResponse extends ApiResponse<TaskData | TaskData[]> {}

export interface VideoScriptResponse extends ApiResponse<{ video_script: string }> {}

export interface VideoTermsResponse extends ApiResponse<{ video_terms: string[] }> {}

export interface MusicFile {
  name: string
  url: string
}

export interface FontFile {
  name: string
}

// ─── Form State ───────────────────────────────────────────────────────────────

export interface FormState extends TaskVideoRequest {
  // derived / UI-only
  tts_server: TtsServer
  script_chunks: ScriptChunk[]
  image_style: string
  characters: Character[]
  reference_strength: number
}

export const defaultFormState: FormState = {
  video_subject: '',
  video_script: '',
  video_terms: '',
  video_aspect: '9:16',
  video_concat_mode: 'random',
  video_transition_mode: 'none',
  video_clip_duration: 5,
  video_count: 1,
  video_source: 'pexels',
  video_language: '',
  voice_name: 'en-US-AndrewNeural',
  voice_volume: 1.0,
  voice_rate: 1.0,
  bgm_type: 'random',
  bgm_file: '',
  bgm_volume: 0.2,
  subtitle_enabled: true,
  subtitle_position: 'bottom',
  custom_position: 70,
  font_name: 'MicrosoftYaHeiBold.ttc',
  text_fore_color: '#FFFFFF',
  font_size: 60,
  stroke_color: '#000000',
  stroke_width: 1.5,
  tts_server: 'custom-tts',
  script_chunks: [],
  image_style: 'realistic',
  characters: [],
  reference_strength: 0.4,
}

// ─── LLM Providers ────────────────────────────────────────────────────────────

export const LLM_PROVIDERS = [
  'openai',
  'moonshot',
  'azure',
  'qwen',
  'deepseek',
  'modelscope',
  'gemini',
  'ollama',
  'g4f',
  'oneapi',
  'cloudflare',
  'ernie',
  'pollinations',
] as const

export type LlmProvider = (typeof LLM_PROVIDERS)[number]

export interface LlmConfig {
  provider: LlmProvider
  api_key: string
  base_url: string
  model_name: string
}

export const defaultLlmConfig: LlmConfig = {
  provider: 'ollama',
  api_key: '',
  base_url: '',
  model_name: '',
}

// ─── Video Languages ──────────────────────────────────────────────────────────

export const VIDEO_LANGUAGES = [
  { value: '', label: 'Auto Detect' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'ru-RU', label: 'Russian' },
  { value: 'es-ES', label: 'Spanish' },
]
