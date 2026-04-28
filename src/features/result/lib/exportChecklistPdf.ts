// ───────────────────────────────────────────────────────────────────────
// Phase 3.5 #62 — focused PDF export for the document checklist.
//
// One A4 page, just the checklist, grouped by HOAI phase. Reuses the
// pdf-lib + brand-font scaffolding from #55. Dynamic-imported by the
// "Checkliste als PDF herunterladen" link so neither pdf-lib nor
// fontkit ship in the main JS bundle.
// ───────────────────────────────────────────────────────────────────────

import { PDFDocument, rgb, type PDFPage } from 'pdf-lib'
import { loadBrandFonts } from '@/lib/fontLoader'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import {
  HOAI_LABELS_DE,
  HOAI_LABELS_EN,
  groupByPhase,
  type HoaiPhase,
} from './hoaiPhases'

const INK = rgb(0.13, 0.14, 0.16)
const CLAY = rgb(0.51, 0.41, 0.32)
const CLAY_DEEP = rgb(0.36, 0.31, 0.25)

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 56

interface BuildArgs {
  project: ProjectRow
  state: Partial<ProjectState>
  lang: 'de' | 'en'
}

export async function buildChecklistPdf({
  project,
  state,
  lang,
}: BuildArgs): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${project.name} — Checkliste`)
  doc.setCreator('Planning Matrix')

  const fonts = await loadBrandFonts(doc)

  const documents = state.documents ?? []
  const grouped = groupByPhase(documents)
  const labels = lang === 'en' ? HOAI_LABELS_EN : HOAI_LABELS_DE

  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  // Header: PROJEKT eyebrow + project name
  page.drawText(lang === 'en' ? 'PROJECT  ·  CHECKLIST' : 'PROJEKT  ·  CHECKLISTE', {
    x: MARGIN,
    y,
    size: 10,
    font: fonts.interMedium,
    color: CLAY,
  })
  y -= 24
  page.drawText(project.name, {
    x: MARGIN,
    y,
    size: 22,
    font: fonts.serif,
    color: INK,
  })
  y -= 24
  if (project.plot_address) {
    page.drawText(project.plot_address, {
      x: MARGIN,
      y,
      size: 11,
      font: fonts.serifItalic,
      color: INK,
      opacity: 0.65,
    })
    y -= 24
  }
  // Hairline divider
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 96, y },
    thickness: 0.5,
    color: INK,
    opacity: 0.3,
  })
  y -= 24

  if (documents.length === 0) {
    page.drawText(
      lang === 'en'
        ? 'No documents identified yet.'
        : 'Noch keine Dokumente erfasst.',
      {
        x: MARGIN,
        y,
        size: 12,
        font: fonts.serifItalic,
        color: CLAY,
      },
    )
  } else {
    Array.from(grouped.entries()).forEach(([phase, docs]) => {
      // Need ~24 px for the phase header + ~22 px per row.
      const needed = 24 + docs.length * 22
      if (y - needed < MARGIN + 40) {
        page = doc.addPage([PAGE_W, PAGE_H])
        y = PAGE_H - MARGIN
      }
      // Phase header — italic Serif numeral + uppercase tracked label
      page.drawText(`${phase as HoaiPhase}  ·  ${labels[phase as HoaiPhase]}`, {
        x: MARGIN,
        y,
        size: 11,
        font: fonts.interMedium,
        color: CLAY_DEEP,
      })
      y -= 16
      docs.forEach((d) => {
        const title = lang === 'en' ? d.title_en : d.title_de
        // Square checkbox
        page.drawRectangle({
          x: MARGIN,
          y: y - 10,
          width: 12,
          height: 12,
          borderColor: INK,
          borderWidth: 0.7,
          borderOpacity: 0.45,
        })
        page.drawText(title, {
          x: MARGIN + 22,
          y: y - 8,
          size: 11,
          font: fonts.inter,
          color: INK,
          maxWidth: PAGE_W - MARGIN * 2 - 22,
        })
        y -= 22
      })
      y -= 8
    })
  }

  // Footer
  const footer =
    (lang === 'en'
      ? 'Generated with Planning Matrix · planning-matrix.app · '
      : 'Generiert mit Planning Matrix · planning-matrix.app · ') +
    new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  doc.getPages().forEach((p: PDFPage) => {
    p.drawText(footer, {
      x: MARGIN,
      y: 28,
      size: 8,
      font: fonts.inter,
      color: INK,
      opacity: 0.55,
    })
  })

  return await doc.save()
}
