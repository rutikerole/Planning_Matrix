import type { ComponentPropsWithRef } from 'react'

/**
 * Honeypot field. Visually hidden, hidden from screen readers, removed
 * from tab order, autocomplete suppressed. Bots that scrape forms
 * tend to fill every input — humans never see this one. The field's
 * presence in the schema (z.string().max(0)) means a non-empty value
 * fails validation and the form silently drops.
 *
 * Field name "website" is innocuous-looking; password managers and
 * autofill agents skip it because of autocomplete="off" + tabindex=-1.
 * Crucially never name this "email" or "password" — managers ignore
 * aria-hidden for those.
 */
export function HoneypotField(props: Omit<ComponentPropsWithRef<'input'>, 'type'>) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      <label htmlFor="website-trap">Website (please leave empty)</label>
      <input
        type="text"
        id="website-trap"
        tabIndex={-1}
        autoComplete="off"
        {...props}
      />
    </div>
  )
}
