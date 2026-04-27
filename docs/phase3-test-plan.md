# Phase 3 — Manual test plan

> 30 brief-listed steps + 3 carried-forward additions from PLAN.md §14.
> Run on the live preview at `https://planning-matrix.vercel.app`.
> Mark each `DONE` or `SKIPPED — reason` and paste the result in the
> batch report.

## Setup

1. Open `https://planning-matrix.vercel.app/sign-in`, sign in (or sign up — autoconfirm is on).
2. Land on `/dashboard`.

## Wizard

1. From `/dashboard`, click `Neues Projekt` → wizard renders at `/projects/new`.
2. Q1: pick `Neubau Einfamilienhaus` → Q2 cross-fades in (300 ms cubic-bezier 0.16 1 0.3 1).
3. Q2: pick `Ja` → address input slides in below.
4. Enter `Hauptstraße 12, 91054 Erlangen` → submit enabled.
5. Click submit → transition screen renders (`Wir bereiten Ihren Tisch vor.` Instrument Serif chapter heading + hairline opacity loop) → land on `/projects/<id>` within ~6 s on a cold cache.
6. `Abbrechen` link triggers the styled `ConfirmDialog` (focus-trapped, Esc closes).

## First-turn rendering

7. Empty state shows briefly, then first assistant message arrives with typewriter.
8. Specialist tag reads `● MODERATOR`, with italic `Moderation` role label below (Polish Move 1). Same in EN — the role label stays in German (sommelier rule).
9. Message body is formal Sie, mentions `Hauptstraße` or `Erlangen`, ends with one `?`.
10. Right rail shows project intent + plot under `Eckdaten`; A/B/C areas dot pattern reflects whatever the moderator returned (typically all three PENDING with reasons on a no-plot project).

## Conversation loop

11. Type a free-text answer, hit Enter → user message appears right-aligned in a paper-on-paper card with hairline border; thinking indicator renders with `MODERATOR` tag, italic role label, three travel dots cycling.
12. Next assistant turn arrives within ~12 s; tag may differ from moderator (handoff to Planungsrecht / Bauordnungsrecht). When it does, hairline-fade rule draws above the new nameplate (Polish Move 2 match-cut).
13. Click `Weiß ich nicht` → focus-trapped popover with three rows. Click `Recherche durchführen lassen` → assistant honors EHRLICHKEITSPFLICHT: explicit "Eine Live-Prüfung ist hier nicht möglich…" rather than a fake B-Plan lookup.
14. When offered `single_select` chips, arrow keys cycle focus, Enter / Space activates.
15. When offered `multi_select` chips, ≥ 1 selection enables `Weiter`.
16. Switch language to EN at top — UI strings switch; specialist italic role labels stay in German.

## Right-rail crystallisation

17. After 3+ turns, `Top 3 Schritte` has 1–3 cards (Polish Move 8 — should *not* be 3 from turn 1). Each card: serif italic clay number prefix, title `text-title-lg`, detail `text-xs`. Footer line lives **outside** the card border with a 12 px hairline above (Polish Move 3).
18. `Eckdaten` shows the three-row block per fact (label / value / qualifier).
19. `Verfahren` collapsible, when expanded, shows ≥ 1 entry (e.g. `Genehmigungsfreistellung (Art. 57 BayBO)` with a clay `erforderlich` status pill).
20. During one thinking phase, the right rail's section eyebrow that's about to update gets a 4 px clay dot pulsing 1.0 → 0.4 → 1.0 (Polish Move 4 — ambient activity).

## Refresh & navigation

21. Refresh the page → conversation persists, instant render, no typewriter on history, no thinking indicator.
22. Open the same URL in a private window with a different account → `ProjectNotFound` page (RLS leak prevention).
23. Sign out from chat (link in left rail) → land on `/dashboard`. Sign back in → `Neues Projekt` CTA still works.

## Edge cases

24. DevTools Network → throttle to "Slow 3G" → next turn surfaces a thinking indicator that lasts longer; no UI freeze.
25. DevTools Network → set offline → submit a message → `OfflineBanner` appears at top; reconnect → banner disappears.
26. DevTools Network → block the Edge Function URL → submit → user message stays visible with retry-affordance behaviour (the chatStore failedRequestIds path).
27. Reduced-motion (Mac System Preferences → Reduce Motion ON) → typewriter is instant, transitions absent, no jank, ambient dot still renders but doesn't pulse.
28. iPhone-sized viewport (375 × 812) → single-column, rails hidden; input bar respects safe-area inset. (Vaul drawers deferred to v1.1 per `phase3-out-of-scope.md`.)

## A11y / final

29. Keyboard-only navigation through wizard, then chat → tab order makes sense, Enter submits, Esc closes popovers + the `ConfirmDialog` + the `IdkPopover`.
30. Visit `/projects/<uuid>` for a UUID that doesn't exist → calm `ProjectNotFound`.

## Carried-forward additions (PLAN.md §14)

31. A11y — VoiceOver / NVDA reads the full assistant message text once, completely (sr-only mirror) instead of the typewriter mid-state.
32. `<title>` on `/projects/:id` reflects `<project.name> · Planning Matrix`. On `/projects/:id/overview` it reads `Übersicht — <project.name> · Planning Matrix`.
33. Sign-out clears TanStack Query cache (no stale messages flash on next sign-in) — already true via `useAuth.signOut → queryClient.clear()`.

## Recording the result

For the batch report, paste:
- Pass / fail per step
- Full transcript of a 5+ turn conversation
- Two screenshots (specialist nameplate + dossier-style right rail)
- Latency distribution per turn
- Cache hit / write ratio for the conversation
- List of specialists who spoke
