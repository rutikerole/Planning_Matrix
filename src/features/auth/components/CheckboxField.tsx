import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  /** Visible label content (can include inline JSX, e.g. links to ToS). */
  children: ReactNode
  error?: string
}

/**
 * Custom checkbox — native input visually hidden, paired with a
 * styled square that fills ink on :checked via CSS-only state
 * (`peer-checked` Tailwind variant). Click the label area to toggle;
 * keyboard works normally because the native input is still in tab
 * order, just visually hidden via `sr-only`.
 */
export function CheckboxField({
  children,
  error,
  id,
  className,
  ref,
  ...rest
}: Props) {
  const reactId = useId().replace(/:/g, '')
  const inputId = id ?? `cb-${reactId}`
  const errorId = `${inputId}-error`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={inputId}
        className="inline-flex items-start gap-3 cursor-pointer text-sm text-ink/80 leading-relaxed select-none"
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="peer sr-only"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            'relative size-[18px] mt-0.5 shrink-0 border rounded-sm transition-colors duration-soft',
            'border-ink/40 bg-transparent',
            'peer-checked:bg-ink peer-checked:border-ink',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ink/35 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
            error && 'border-clay/80',
          )}
        >
          <svg
            viewBox="0 0 16 16"
            className="absolute inset-0 size-full p-[3px] text-paper opacity-0 group-has-[:checked]:opacity-100 peer-checked:opacity-100 transition-opacity duration-soft"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3,8 7,12 13,4" />
          </svg>
        </span>
        <span>{children}</span>
      </label>
      {error && (
        <p
          id={errorId}
          className="text-xs text-ink/75 border-l border-clay pl-2.5 ml-7"
        >
          {error}
        </p>
      )}
    </div>
  )
}
