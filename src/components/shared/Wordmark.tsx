import { cn } from '@/lib/utils'

interface Props {
  className?: string
  size?: 'sm' | 'lg'
  asLink?: boolean
}

export function Wordmark({ className, size = 'sm', asLink = true }: Props) {
  const inner = (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-ink select-none',
        className,
      )}
      aria-label="Planning Matrix"
    >
      <span
        aria-hidden="true"
        className="block size-[7px] bg-clay shrink-0"
      />
      <span
        className={cn(
          'font-sans font-medium tracking-[-0.012em] leading-none',
          size === 'sm' ? 'text-[15px]' : 'text-[19px]',
        )}
      >
        Planning Matrix
      </span>
    </span>
  )

  if (asLink) {
    return (
      <a
        href="/"
        className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        {inner}
      </a>
    )
  }
  return inner
}
