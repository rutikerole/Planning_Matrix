# Planning Matrix — `docs/`

Engineering reference material for the Planning Matrix codebase. Anything user-facing (legal pages, marketing, contract docs) lives elsewhere — this directory is for the team.

## Contents

| File | What it covers | Last refresh |
|---|---|---|
| `data-freshness.md` | Snapshot/freshness gate for the legal-data slice | Phase 4 |
| `eval-harness.md` | Conversation eval harness (`scripts/eval-harness/`) | Phase 4 |
| `landing-redesign-research.md` | Notes from the landing-page redesign round | Phase 3 |
| `launch-checklist.md` | Pre-go-live checklist (legal, hosting, observability, etc.) | Phase 5 |
| `mobile-support.md` | Mobile-specific implementation notes (vaul drawers, viewport) | Phase 3 |
| `privacy.md` | Privacy posture for the AI / data flow | Phase 3 |
| `security.md` | RLS posture, secret handling, CSP rationale | Phase 3 |
| `audits/` | Versioned snapshots of architecture/code audits | rolling |

## Audits archive

Each audit run lands in its own dated subdirectory:

- `audits/2026-05-04/` — Munich-narrowing audit (chat-turn pipeline, system prompt, Munich leakage on landing). Pre-sprint baseline that drove the Phase 5 fix sprint (commits `b5f2343` … `60d3946`). The matching **`FIX_REPORT.md`** at the repo root summarises what was fixed and what was deferred.

## Specs in repo

- **`PHASE_3_BRIEF.md`** — the build brief for the chat core (Phase 3, ~67 KB, April 2026). Source of truth for: turn protocol (§7), the 7-specialist roundtable (§5), the 43-item edge-case list (§12), the system-prompt content (§4.5), the wizard flow (§5), the chat workspace layout (§6), and the visual / atelier register (§8). Every Phase 5 + Phase 6 audit anchors to this document.

## Conspicuously missing

- **`MASTER_DOC.md`** — the higher-order architecture document referenced throughout codebase comments and audit reports (3 layers, 4 repositories, 11 agents, 8 gates, qualifier framework, three legal domains, eight design principles). Searched: repo root, `~/Downloads/`, `/mnt/project/`. Not found locally. If it exists in Notion / Drive, copy it to `docs/MASTER_DOC.md` to give future audits a stable architectural anchor.

## Convention

- Use markdown.
- One file per topic.
- When a doc is superseded, move it to `docs/_archive/<date>-<name>.md` rather than deleting; the audit trail is part of the value.
