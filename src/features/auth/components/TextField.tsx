import { useId, type ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/utils'

type Props = ComponentPropsWithRef<'input'> & {
  label: string
  error?: string
}

/**
 * Generic text input — visible label, bottom-border-only, error
 * styling matches EmailField/PasswordField. Use for full name, etc.
 */
export function TextField({
  label,
  error,
  id,
  className,
  ref,
  type = 'text',
  ...rest
}: Props) {
  const reactId = useId().replace(/:/g, '')
  const inputId = id ?? `text-${reactId}`
  const errorId = `${inputId}-error`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink/85">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full bg-transparent border-0 border-b border-ink/30 py-2.5 px-0 text-base text-ink placeholder:text-ink/40 transition-colors duration-soft ease-soft',
          'focus:border-ink/75 focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-4 focus-visible:ring-offset-background',
          'disabled:opacity-50 disabled:pointer-events-none',
          error && 'border-clay/80',
        )}
        {...rest}
      />
      {error && (
        <p
          id={errorId}
          className="text-xs text-ink/75 border-l border-clay pl-2.5 mt-0.5"
        >
          {error}
        </p>
      )}
    </div>
  )
}
