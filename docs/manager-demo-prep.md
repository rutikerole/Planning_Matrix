# Manager demo — prep notes

> Placeholder shipped in Phase 3.1 #34, refreshed in Phase 3.3 #51,
> Phase 3.6 #74. The dashboard is the entry point. Phase 3.6 added
> mode separation — the demo now alternates between deliverable
> register (landing → auth → wizard → cover hero → PDF → share) and
> operating register (chat input bar → progress → overview cockpit →
> result page sections II–XII). Capture screenshots / recordings in
> §7 once the demo's been walked end-to-end.

## Phase 3.6 demo walk (the new sequence)

1. **Landing (`/`) — DELIVERABLE.** Atelier defaults: paper grain, blueprint substrate, italic Serif headlines, photographic atmospheres. Don't dwell — the manager has seen it.
2. **Sign-up → wizard — DELIVERABLE.** Two-question initialization, paper-card chrome, Roman-numeral progress, atelier transition with pen-drawing-the-scale-line. This is what makes Neo not feel like "generic AI chatbot #4823."
3. **Chat workspace — OPERATING.** Persistent rounded input bar at the bottom (always visible — no more Continue-button replacement). Type a message, hit Enter, watch the streaming response. **Tap the paperclip** — opens the file picker; pick a B-Plan PDF and a photo; chips appear in the input bar; click Send.
4. **Top-of-thread progress bar.** 7 segments mapping to the conversation gates, current segment fills in drafting-blue/65, percent + turn count on the right. Replaces the dotted hairline.
5. **Suggestion chips above the bar.** Yes/No, single-select, multi-select, address — chips render above the textarea, never replace it. Click a chip → fills the textarea (append on newline if text already there). Multi-select keeps a `Übernehmen` button.
6. **Overview cockpit (`/projects/:id/overview`) — OPERATING.** Linear-style header + 8 sortable tabs (Projekt / Daten / Bereiche / Verfahren / Dokumente / Team / Empfehlungen / Audit). Click the value cell on a CLIENT-source fact in the Daten tab → inline editor → Enter saves. The change appears in the Audit tab as `fact_corrected_by_owner`.
7. **Result page (`/projects/:id/result`) — MIXED.** Section I (cover hero) is sacred atelier — the moment. Sections II–XII run in operating mode: Verdict has an expandable "Warum dieses Verfahren?", Top-3 has per-card "Begonnen" toggles (localStorage), Legal Landscape has inline rule-text expansion, Documents is a 3-column kanban (Erforderlich / In Arbeit / Liegt vor) with click-to-move, Risk Flags has "Diese Annahme klären" → drawer that converts ASSUMED → CLIENT/DECIDED.
8. **Export.** Click Export → PDF → file downloads. After 3.6 #73, this works with or without brand TTFs (the `winAnsiSafe` sanitizer covers the Helvetica fallback path). On simulated failure (block `/fonts/` in DevTools) the calm error UI appears with a "Markdown stattdessen" CTA.
9. **Share view.** Generate a link → open in incognito → read-only result page renders. Cover hero animation plays; sections II–XII show without owner-only affordances.

The point of the alternation: the manager *feels* atelier on the deliverable surfaces (where it earns its keep) and *feels* density-honest function on the working surfaces (where atelier was actively hurting). Don't say "we have two modes" — let them feel it.

## Suggested structure (delete and replace as you populate)

### 1 · Open with the dashboard (Phase 3.3 #47)

- Sign in. Land on `/dashboard`.
- **No "in Aufbau" eyebrow** — the dashboard is now `ATELIER · WILLKOMMEN`,
  Instrument Serif welcome headline, italic Serif activity sentence
  ("Drei laufende Projekte. Letzte Aktivität: heute, 11:31.").
- Project list reads as architectural-schedule index — Roman numerals
  I/II/III in italic Serif clay-deep, Instrument Serif project names,
  italic clay timestamps + Wendungen counts, state pills (● Aktiv /
  ○ Pausiert / ─ Entwurf / ✓ Abgeschlossen), drafting-blue arrow chevrons.
- Hover a row → ink darken + arrow shifts +2px right + numeral +1px.
- Background is paper grain + blueprint substrate (no rooftop photo).
- Wordmark in the top-left is the new axonometric building glyph at
  drafting-blue 85% (#50). Pause to point this out — "the same lockup
  is on every screen now."

### 2 · Open the wizard (Phase 3.3 #48)

- Click `+ Neu` (or `Neues Projekt` if 0 projects).
- Q1 paper card with title block: eyebrow, Roman numeral I on a
  hairline rule, Instrument Serif headline + clay punctuation, italic
  Serif sub. NorthArrow rosette top-right of the sheet (animates in).
- Chips are paper-tab cards. Hover lifts 1px + drafting-blue 5% tint.
- Pick `Neubau Einfamilienhaus`.
- Q2 paper card with Roman numeral II active. Yes/No paper-tab toggle.
  Address input lives in a `<PaperSheet padded="sm">` wrapper with
  italic Serif helper.
- Click `Projekt anlegen`. **Watch the transition cinema** — atelier
  illustration with the pen drawing the 1cm scale line, "Der Tisch
  wird gedeckt." headline, Polish Move 5 hairline morph into chat.

### 3 · The team enters the room

- Moderator's first message renders with typewriter.
- Note: italic German role label below the tag (Polish Move 1 — the move that does the most work for product feeling).
- Right rail starts populating — first the Eckdaten, then maybe one Top-3 entry.

### 4 · The handoff

- Answer the moderator. Watch the match-cut as Planungsrecht takes over (Polish Move 2: hairline draws across, then the new nameplate scales in).
- Right rail's `Bereiche` flips A from PENDING to ACTIVE.
- Ambient activity dot pulses next to the section about to update during the next thinking phase (Polish Move 4).

### 5 · The honesty moment

- When Planungsrecht asks something specific the user might not know, click `Weiß ich nicht` → `Recherche durchführen lassen`.
- The model honestly says it can't run a live B-Plan lookup, marks the assumption, continues.
- This is the moment that lands trust with a serious German Bauherr.

### 6 · The dossier crystallises

- After 3-4 turns, walk through the right rail: Top-3 with serif italic numbers and outside-the-card footer line, Eckdaten in three-row blocks, Verfahren / Dokumente / Fachplaner expanding.
- Click `Vollständige Übersicht öffnen` to show the architect's view.

### 7 · Mobile

- Open the same project on a phone (or DevTools mobile emulation).
- Hamburger opens the gates list. Rail icon opens the dossier. Both swipe-close.

## Talking points

- One of the calmer chat UIs you'll see — deliberately not iMessage.
- Cache architecture: 90% input-side discount on every turn after the first. ~$0.02/turn at Sonnet 4.5 prices.
- Bayern-grounded persona: BayBO Art. 2 / 6 / 47 / 57 / 58 / 59 / 61, BauGB §§ 30 / 34 / 35, GEG 2024, PV-Pflicht since 1.1.2025.
- The legal frame: every recommendation carries the "Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in" line outside the card. The product is calibrated to the German legal architecture, not pretending to be the architect itself.

## Things to disclaim

- Latency: 12–25 seconds per turn typical. Streaming is Phase 4.
- DESIGNER-side (architect cockpit) is the next surface, not in this demo.
- Templates T-02..T-05 are stubs that route into T-01 with annotations.
- No real geocoding / B-Plan lookup yet — the model is honest about this.

## Captured screenshots and recordings

- // TODO: paste links / file paths here once captured

### Phase 3.3 — required captures (per brief §3.5)

- Dashboard (full, populated)
- Dashboard (empty state with atelier table illustration)
- Wizard Q1 with new paper card
- Wizard Q2
- Sign-in page
- Sign-up page
- Wordmark zoomed in (showing the axonometric glyph + tightened lockup)
- Mobile dashboard (375×812)
- Short screen recording of dashboard → wizard → chat workspace
  (~12 seconds), showing the unified visual language across all
  three surfaces.
