import { forwardRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { INTENT_TO_I18N, type Intent } from '../lib/selectTemplate'
import type { TemplateId } from '@/types/projectState'
import { SKETCH_SVGS } from '../lib/sketchSvgs'

interface Props {
  intent: Intent
  templateCode: TemplateId
  selected: boolean
  onSelect: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void
}

/**
 * v3 Q1 sketch card. The SVG inline-renders from `SKETCH_SVGS`
 * (verbatim from the prototype); the `.pri` / `.sec` stroke
 * architecture lives in `sketches.css` and draws the secondary
 * strokes on hover or when the card is `.on`.
 */
export const SketchCard = forwardRef<HTMLButtonElement, Props>(function SketchCard(
  { intent, templateCode, selected, onSelect, onKeyDown },
  ref,
) {
  const { t } = useTranslation()
  const slug = INTENT_TO_I18N[intent]
  const label = t(`wizard.q1.options.${slug}.label`)

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        'sketch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
        selected && 'on',
      )}
    >
      <span dangerouslySetInnerHTML={{ __html: SKETCH_SVGS[intent] }} />
      <div className="label">
        <div className="name">{label}</div>
        <div className="code">{templateCode}</div>
      </div>
    </button>
  )
})
