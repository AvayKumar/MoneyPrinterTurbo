import { useState } from 'react'

interface MediaCarouselProps {
  urls: string[]
  index: number
  onIndexChange: (i: number) => void
  type: 'image' | 'video'
  className?: string
  style?: React.CSSProperties
  onLightboxOpen?: (url: string) => void
  alt?: string
}

export default function MediaCarousel({
  urls,
  index,
  onIndexChange,
  type,
  className,
  style,
  onLightboxOpen,
  alt,
}: MediaCarouselProps) {
  const [hovered, setHovered] = useState(false)
  const current = urls[index] ?? urls[0]
  const hasMultiple = urls.length > 1

  function prev(e: React.MouseEvent) {
    e.stopPropagation()
    onIndexChange((index - 1 + urls.length) % urls.length)
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation()
    onIndexChange((index + 1) % urls.length)
  }

  return (
    <div
      className="relative w-full"
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Index badge */}
      {hasMultiple && (
        <div className="absolute top-1 left-1 z-10 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded leading-none pointer-events-none">
          {index + 1}/{urls.length}
        </div>
      )}

      {/* Media */}
      {type === 'image' ? (
        <img
          src={current}
          alt={alt ?? ''}
          className={`w-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity ${className ?? ''}`}
          style={{ display: 'block', maxHeight: style?.maxHeight }}
          onClick={() => onLightboxOpen?.(current)}
        />
      ) : (
        <video
          src={current}
          controls
          className={`w-full rounded ${className ?? ''}`}
          style={{ display: 'block', maxHeight: style?.maxHeight }}
        />
      )}

      {/* Navigation arrows */}
      {hasMultiple && hovered && (
        <>
          <button
            onClick={prev}
            className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded text-xs w-5 h-5 flex items-center justify-center leading-none transition-colors"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded text-xs w-5 h-5 flex items-center justify-center leading-none transition-colors"
          >
            ›
          </button>
        </>
      )}
    </div>
  )
}
