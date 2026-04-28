import { useId, type ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/utils'

type Props = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  label: string
  error?: string
}

/**
 * Email input. Visible label above (WCAG 2.2 SC 3.3.2), bottom-border-
 * only treatment matching the landing's hairline aesthetic, with a
 * focus-visible offset ring for keyboard users (keeps mouse focus
 * minimal). autoComplete=email + inputMode=email + spellCheck=false +
 * autoCapitalize=off baked in.
 */
export function EmailField({
  label,
  error,
  id,
  className,
  ref,
  ...rest
}: Props) {
  const reactId = useId().replace(/:/g, '')
  const inputId = id ?? `email-${reactId}`
  const errorId = `${inputId}-error`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-ink/85"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        type="email"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        autoCapitalize="off"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full bg-transparent border-0 border-b border-ink/25 py-2.5 px-0 text-base text-ink placeholder:text-ink/40 transition-colors duration-soft ease-soft',
          'focus:border-drafting-blue/60 focus:outline-none',
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
