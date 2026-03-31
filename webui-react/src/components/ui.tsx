/**
 * Lightweight UI primitives styled for dark theme.
 * Using plain Tailwind classes — no shadcn/ui generator needed.
 */
import React from 'react'

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-[#1a1f2e] border border-[#2a3044] rounded-lg p-4 ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-semibold text-[#7c8ab0] uppercase tracking-wider mb-3">
      {children}
    </div>
  )
}

// ─── Label ────────────────────────────────────────────────────────────────────

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium text-[#9ba3bf] mb-1"
    >
      {children}
    </label>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

export const inputClass =
  'w-full bg-[#0f1117] border border-[#2a3044] rounded-md px-3 py-1.5 text-sm text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#4299e1] transition-colors'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputClass} resize-none ${props.className ?? ''}`}
    />
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputClass} cursor-pointer ${props.className ?? ''}`}
    />
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantClass: Record<string, string> = {
  primary:
    'bg-[#4299e1] hover:bg-[#3182ce] text-white',
  secondary:
    'bg-[#2a3044] hover:bg-[#3a4054] text-[#e2e8f0] border border-[#3a4054]',
  ghost: 'bg-transparent hover:bg-[#2a3044] text-[#9ba3bf]',
  danger: 'bg-[#e53e3e] hover:bg-[#c53030] text-white',
}

const sizeClass: Record<string, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-1.5 text-sm',
  lg: 'px-6 py-2.5 text-base font-semibold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner size={14} /> {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}

// ─── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  label?: string
}

export function Slider({ min, max, step = 1, value, onChange, label }: SliderProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#4299e1] cursor-pointer"
      />
      <span className="text-xs text-[#9ba3bf] w-10 text-right tabular-nums">
        {label ?? value}
      </span>
    </div>
  )
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

interface CheckboxProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  id: string
}

export function Checkbox({ checked, onChange, label, id }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#4299e1] cursor-pointer"
      />
      <span className="text-sm text-[#e2e8f0]">{label}</span>
    </label>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── ColorPicker ─────────────────────────────────────────────────────────────

interface ColorPickerProps {
  value: string
  onChange: (v: string) => void
  label?: string
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-[#2a3044] bg-transparent"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 font-mono text-xs"
        maxLength={7}
      />
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────

export function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border border-[#2a3044] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1f2e] hover:bg-[#1e2336] text-sm font-medium text-[#e2e8f0] transition-colors"
      >
        <span>{title}</span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-4 pb-4 pt-2 bg-[#161b28]">{children}</div>}
    </div>
  )
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export function Progress({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full bg-[#2a3044] rounded-full h-2">
      <div
        className="bg-[#4299e1] h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

const badgeColors: Record<string, string> = {
  pending: 'bg-[#2a3044] text-[#9ba3bf]',
  processing: 'bg-[#2b4a7e] text-[#63b3ed]',
  complete: 'bg-[#1a3a2a] text-[#68d391]',
  failed: 'bg-[#3a1a1a] text-[#fc8181]',
}

export function StatusBadge({ state }: { state: 0 | 1 | 2 | 3 }) {
  const labels = ['Pending', 'Processing', 'Complete', 'Failed']
  const keys = ['pending', 'processing', 'complete', 'failed']
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColors[keys[state]]}`}
    >
      {labels[state]}
    </span>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-[#2a3044] my-3" />
  return (
    <div className="flex items-center gap-2 my-3">
      <hr className="flex-1 border-[#2a3044]" />
      <span className="text-xs text-[#4a5568]">{label}</span>
      <hr className="flex-1 border-[#2a3044]" />
    </div>
  )
}

// ─── FormRow ─────────────────────────────────────────────────────────────────

export function FormRow({
  label,
  children,
  htmlFor,
}: {
  label: string
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <div className="mb-3">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
