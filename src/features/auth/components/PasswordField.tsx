import {
  useId,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type FocusEvent as ReactFocusEvent,
  type ChangeEvent as ReactChangeEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { passwordStrength } from '@/lib/authValidation'

type AutocompleteValue =
  | 'current-password'
  | 'new-password'
  | 'one-time-code'

type Props = Omit<ComponentPropsWithRef<'input'>, 'type' | 'autoComplete'> & {
  label: string
  hint?: string
  error?: string
  /** Use 'current-password' on sign-in, 'new-password' on sign-up + reset. */
  autoComplete: AutocompleteValue
  /** Show the 3-bar strength meter below the input. Off by default. */
  showStrength?: boolean
}

/**
 * Password input with three pieces of polish:
 *   1. Show/hide toggle as a real <button aria-pressed>, with a stable
 *      aria-label (no mutation — research-recommended).
 *   2. Caps-lock detector that ONLY appears while the field is
 *      focused AND caps lock is on. aria-live="polite", never blocks
 *      submit. Cleared on blur.
 *   3. Optional 3-bar strength meter (weak/fair/strong) — purely
 *      informational. Schema validation is what gates submission.
 *
 * Always passes-through react-hook-form's onBlur/onChange so the
 * caller's validation hooks still fire.
 */
export function PasswordField({
  label,
  hint,
  error,
  id,
  className,
  ref,
  autoComplete,
  showStrength = false,
  onBlur: rhfOnBlur,
  onChange: rhfOnChange,
  onKeyDown: extOnKeyDown,
  onFocus: extOnFocus,
  ...rest
}: Props) {
  const { t } = useTranslation()
  const reactId = useId().replace(/:/g, '')
  const inputId = id ?? `pwd-${reactId}`
  const errorId = `${inputId}-error`
  const hintId = hint ? `${inputId}-hint` : undefined
  const capsId = `${inputId}-caps`

  const [revealed, setRevealed] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [value, setValue] = useState('')

  const handleKeyEvent = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsOn(e.getModifierState('CapsLock'))
    }
    extOnKeyDown?.(e)
  }

  const handleFocus = (e: ReactFocusEvent<HTMLInputElement>) => {
    setHasFocus(true)
    extOnFocus?.(e)
  }

  const handleBlur = (e: ReactFocusEvent<HTMLInputElement>) => {
    setHasFocus(false)
    setCapsOn(false)
    rhfOnBlur?.(e)
  }

  const handleChange = (e: ReactChangeEvent<HTMLInputElement>) => {
    if (showStrength) setValue(e.target.value)
    rhfOnChange?.(e)
  }

  const describedBy = [hint && hintId, error && errorId, hasFocus && capsOn && capsId]
    .filter(Boolean)
    .join(' ') || undefined

  const score = showStrength ? passwordStrength(value) : 0
  const strengthLabel =
    score === 1 ? t('auth.passwordStrength.weak')
    : score === 2 ? t('auth.passwordStrength.fair')
    : score === 3 ? t('auth.passwordStrength.strong')
    : ''

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink/85">
        {label}
      </label>

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={revealed ? 'text' : 'password'}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="off"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onKeyDown={handleKeyEvent}
          onKeyUp={handleKeyEvent}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className={cn(
            'w-full bg-transparent border-0 border-b border-ink/30 py-2.5 pl-0 pr-9 text-base text-ink placeholder:text-ink/40 transition-colors duration-soft ease-soft',
            'focus:border-ink/75 focus:outline-none',
            'focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-4 focus-visible:ring-offset-background',
            'disabled:opacity-50 disabled:pointer-events-none',
            error && 'border-clay/80',
          )}
          {...rest}
        />
        <button
          type="button"
          aria-pressed={revealed}
          aria-label={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
          onClick={() => setRevealed((v) => !v)}
          className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center text-ink/55 hover:text-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors rounded-sm"
        >
          {revealed ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink/55 mt-0.5">
          {hint}
        </p>
      )}

      {showStrength && score > 0 && (
        <div
          aria-label={t('auth.passwordStrength.label')}
          className="flex items-center gap-2 mt-1"
        >
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  'h-0.5 w-7 transition-colors duration-soft',
                  score >= n ? 'bg-clay' : 'bg-ink/15',
                )}
              />
            ))}
          </div>
          <span className="text-[11px] text-ink/55">{strengthLabel}</span>
        </div>
      )}

      {/* Caps-lock hint — visible only while focused AND caps-on.
          aria-live="polite" so screen readers get a calm announcement. */}
      <p
        id={capsId}
        aria-live="polite"
        className={cn(
          'text-xs text-clay border-l border-clay/80 pl-2.5 mt-0.5 transition-opacity duration-soft',
          hasFocus && capsOn ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 m-0 p-0 overflow-hidden',
        )}
      >
        {hasFocus && capsOn ? t('auth.capsLock') : ''}
      </p>

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
