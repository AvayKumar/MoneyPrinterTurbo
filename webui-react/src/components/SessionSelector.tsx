import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listSessions, deleteSession } from '@/api/sessions'
import type { SessionSummary } from '@/api/sessions'

interface Props {
  currentSessionId: string | null
  onSessionChange: (sessionId: string) => void
  onNewSession: () => void
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function SessionSelector({
  currentSessionId,
  onSessionChange,
  onNewSession,
}: Props) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<SessionSummary | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => listSessions(50, 0),
    staleTime: 10_000,
  })

  const sessions = data?.sessions ?? []
  const current = sessions.find((s) => s.id === currentSessionId)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleDeleteClick(e: React.MouseEvent, session: SessionSummary) {
    e.stopPropagation()
    if (sessions.length <= 1) return
    setConfirmDelete(session)
  }

  async function handleDeleteConfirm() {
    if (!confirmDelete) return
    const session = confirmDelete
    setConfirmDelete(null)
    await deleteSession(session.id)
    queryClient.invalidateQueries({ queryKey: ['sessions'] })
    if (session.id === currentSessionId) {
      const next = sessions.find((s) => s.id !== session.id)
      if (next) onSessionChange(next.id)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-[#2a3044] bg-[#1a1f2e] text-[#e2e8f0] hover:bg-[#252b3d] transition-colors max-w-[220px]"
      >
        <span className="truncate">
          {current?.name || 'Select Session'}
        </span>
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 w-72 max-h-80 overflow-y-auto rounded border border-[#2a3044] bg-[#1a1f2e] shadow-xl z-50">
          <button
            onClick={() => {
              onNewSession()
              setOpen(false)
            }}
            className="w-full text-left px-3 py-2 text-xs text-[#4299e1] hover:bg-[#252b3d] border-b border-[#2a3044] transition-colors"
          >
            + New Session
          </button>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                onSessionChange(s.id)
                setOpen(false)
              }}
              className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-[#252b3d] transition-colors ${
                s.id === currentSessionId
                  ? 'bg-[#252b3d] text-[#4299e1]'
                  : 'text-[#e2e8f0]'
              }`}
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="truncate font-medium">
                  {s.name || 'Untitled Session'}
                </div>
                <div className="text-[#4a5568]">{timeAgo(s.updated_at)}</div>
              </div>
              {sessions.length > 1 && (
                <button
                  onClick={(e) => handleDeleteClick(e, s)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-[#4a5568] hover:text-[#fc8181] hover:bg-[#2a1a1a] transition-colors"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg p-5 w-80 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[#e2e8f0] font-semibold">Delete Session?</p>
            <p className="text-xs text-[#9ba3bf]">
              "{confirmDelete.name || 'Untitled Session'}" will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-xs px-4 py-1.5 rounded border border-[#2a3044] text-[#9ba3bf] hover:bg-[#252b3d] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="text-xs px-4 py-1.5 rounded bg-[#c53030] text-white hover:bg-[#e53e3e] transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
