import { cn } from '@/lib/utils'

interface Props {
  /** Filename stem in /public/images/, without -1600.avif etc. */
  stem: string
  alt: string
  /** Override the desktop width (default 1600). */
  desktopWidth?: number
  /** Override the mobile width (default 900). */
  mobileWidth?: number
  /** Native width / height for layout stability. */
  width?: number
  height?: number
  className?: string
  imgClassName?: string
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
  decoding?: 'async' | 'sync' | 'auto'
  /** Sizes hint (default 100vw). */
  sizes?: string
}

/**
 * Renders <picture> with AVIF → WebP → JPG fallback, expecting variants
 * named `${stem}-${width}.${ext}` in /public/images/. The image pipeline
 * (npm run images) generates these from images-source/${stem}.jpg.
 */
export function Picture({
  stem,
  alt,
  desktopWidth = 1600,
  mobileWidth = 900,
  width,
  height,
  className,
  imgClassName,
  loading = 'lazy',
  fetchPriority,
  decoding = 'async',
  sizes = '100vw',
}: Props) {
  const m = mobileWidth
  const d = desktopWidth
  return (
    <picture className={cn(className)}>
      <source
        type="image/avif"
        srcSet={`/images/${stem}-${m}.avif ${m}w, /images/${stem}-${d}.avif ${d}w`}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={`/images/${stem}-${m}.webp ${m}w, /images/${stem}-${d}.webp ${d}w`}
        sizes={sizes}
      />
      <img
        src={`/images/${stem}-${d}.jpg`}
        srcSet={`/images/${stem}-${m}.jpg ${m}w, /images/${stem}-${d}.jpg ${d}w`}
        sizes={sizes}
        alt={alt}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        width={width}
        height={height}
        className={imgClassName}
      />
    </picture>
  )
}
