import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { FormState, TaskData } from '@/types'
import { createVideoTask } from '@/api/videos'
import { getTask } from '@/api/videos'
import { Button, Progress, StatusBadge, Spinner } from './ui'

interface Props {
  form: FormState
}

function validate(form: FormState): string | null {
  if (!form.video_subject?.trim()) return 'Video subject is required.'
  if (!form.voice_name?.trim()) return 'Please select a voice.'
  if (form.video_source === 'pexels' || form.video_source === 'pixabay') {
    // API key validation is backend-side
  }
  return null
}

export default function GenerationPanel({ form }: Props) {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  const { data: taskData } = useQuery<TaskData>({
    queryKey: ['task', taskId],
    queryFn: () => getTask(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const state = query.state.data?.state
      return state === 2 || state === 3 ? false : 2000
    },
  })

  // Accumulate logs from task state
  useEffect(() => {
    if (!taskData) return
    if (taskData.logs && taskData.logs.length > 0) {
      setLogs(taskData.logs)
    } else if (taskData.state === 1) {
      setLogs((prev) => {
        const msg = `Processing… ${taskData.progress ?? 0}%`
        if (prev[prev.length - 1] === msg) return prev
        return [...prev, msg]
      })
    } else if (taskData.state === 2) {
      setLogs((prev) => [...prev, '✅ Video generation complete!'])
    } else if (taskData.state === 3) {
      setLogs((prev) => [...prev, `❌ Error: ${taskData.error ?? 'Unknown error'}`])
    }
  }, [taskData])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  async function handleGenerate() {
    const validationError = validate(form)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLogs(['🚀 Submitting video task…'])
    setTaskId(null)
    setGenerating(true)

    try {
      const { tts_server: _tts, ...payload } = form
      const id = await createVideoTask(payload)
      setTaskId(id)
      setLogs((prev) => [...prev, `Task created: ${id}`])
    } catch (e) {
      setError((e as Error).message)
      setLogs((prev) => [...prev, `❌ ${(e as Error).message}`])
    } finally {
      setGenerating(false)
    }
  }

  function handleReset() {
    setTaskId(null)
    setLogs([])
    setError(null)
  }

  const isRunning = taskData?.state === 0 || taskData?.state === 1
  const isDone = taskData?.state === 2
  const isFailed = taskData?.state === 3
  const progress = taskData?.progress ?? 0

  const videos = [
    ...(taskData?.combined_videos ?? []),
    ...(taskData?.videos ?? []),
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      {/* Generate Button */}
      <div className="flex gap-3 items-center">
        <Button
          size="lg"
          className="flex-1"
          onClick={handleGenerate}
          loading={generating || isRunning}
          disabled={generating || isRunning}
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <Spinner size={16} /> Generating Video…
            </span>
          ) : (
            '🎬 Generate Video'
          )}
        </Button>
        {(isDone || isFailed) && (
          <Button variant="secondary" size="lg" onClick={handleReset}>
            Reset
          </Button>
        )}
      </div>

      {error && (
        <div className="text-sm text-[#fc8181] bg-[#3a1a1a] border border-[#5a2a2a] rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Progress */}
      {taskId && (
        <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#e2e8f0]">Task Progress</span>
            {taskData && <StatusBadge state={taskData.state} />}
          </div>

          {isRunning && (
            <>
              <Progress value={progress} />
              <div className="text-xs text-[#9ba3bf] tabular-nums">{progress}% complete</div>
            </>
          )}

          {isDone && <Progress value={100} />}
          {isFailed && (
            <div className="text-xs text-[#fc8181]">
              Generation failed. Check logs below.
            </div>
          )}
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-[#0a0d14] border border-[#2a3044] rounded-lg p-3">
          <div className="text-xs font-medium text-[#7c8ab0] uppercase tracking-wider mb-2">
            Logs
          </div>
          <div
            ref={logRef}
            className="font-mono text-xs text-[#9ba3bf] max-h-40 overflow-y-auto space-y-1"
          >
            {logs.map((line, i) => (
              <div key={i} className="leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Results */}
      {isDone && videos.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-[#e2e8f0]">
            Generated Videos ({videos.length})
          </div>
          {videos.map((url, i) => (
            <div
              key={i}
              className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg p-3 space-y-2"
            >
              <video
                src={`/api/stream/${encodeURIComponent(url)}`}
                controls
                className="w-full rounded-md max-h-72 bg-black"
              />
              <a
                href={`/api/download/${encodeURIComponent(url)}`}
                download
                className="inline-flex items-center gap-1 text-xs text-[#4299e1] hover:underline"
              >
                ⬇ Download video {i + 1}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
