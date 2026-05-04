# Planning Matrix — Munich Go-Live Fix Sprint · Report
> Date: 2026-05-04 · Branch: `main` · Author: Claude Code (ultrathink mode)
> Pre-sprint SHA: `4ac4333` · Post-sprint SHA: `0769b8c`
> Authoritative refs: `docs/audits/2026-05-04/AUDIT_REPORT.md` (the audit this sprint executes against)

## Summary

The five-phase Munich go-live sprint shipped end-to-end as **10 commits on `main`**. All three P0 audit blockers are closed: the landing demo no longer mentions Erlangen, the wizard hard-gates non-München addresses through a confirmable warning + persisted CLIENT/DECIDED fact, and BayBO Art. 59 is now defined in the system prompt. Additionally, the legal-shield clause is unified to one canonical phrasing, the Anthropic model is on Sonnet 4.6, the offline queue-and-flush honours the existing OfflineBanner promise, the post-2025 BayBO modernization is reflected in the prompt (D.1–D.9 verification), the second-account RLS smoke test is documented, and the audit history is now version-controlled under `docs/audits/`. Build green: 238 KB gz (under the 300 KB ceiling), 890 locale keys with DE/EN parity, ESLint 0/0, TypeScript clean.

## Phase-by-phase status

| Phase | Subject | Status | Commit | Notes |
|---|---|---|---|---|
| **A.1** | Replace Erlangen landing demo with München | ✓ done | `b5f2343` | chatScript.ts (DE+EN), addresses.ts (4 München addresses across 4 Stadtbezirke + non-exported `_DEPRECATED_ADDRESSES`), de/en.json line 60 + hero card2 (Stp 2 → 1, generic rec → LBK München), Trust.tsx fixture |
| **A.2** | Wizard München PLZ gate (mode B) | ✓ done | `f9d83f3` | Confirmable warning, "Adresse prüfen" CTA flip, `plot.outside_munich_acknowledged` CLIENT/DECIDED fact, 5 new locale keys × 2 langs, reduced-motion + aria-live respected |
| **A.3** | Add BayBO Art. 59 to bayern.ts | ✓ done | `9802412` | ~30-line block defining Anwendungsbereich, Prüfungsumfang, 3-Wochen-Frist (Art. 65), keine Genehmigungsfiktion, typische Münchner Anwendungsfälle. Art. 60 reframed as "Sonderbau-Verfahren" |
| **B.1** | Unify legal-shield clause | ✓ done | `1b7e5cf` | Canonical "Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in." across system prompt + UI footer + i18n + PDF/Markdown exports + CoverHero. EN: "Preliminary — to be confirmed by a certified architect (Bauvorlageberechtigte/r)." Sleeping erlangen.ts left untouched |
| **B.2** | Offline queue-and-flush | ✓ done | `60d3946` | OfflineQueueEntry[] in chatStore (cap 5), `enqueueOffline` / `removeFromOfflineQueue`, `useChatTurn` parks turns when navigator.onLine === false, new `useOfflineQueueDrain` hook replays via clientRequestId idempotency, OfflineBanner surfaces queue depth, InputBar disables at cap |
| **B.3** | Refresh stale comments | ✓ done | `936ebc5` | shared.ts:7 + systemPrompt.ts:21 slice-list updated. Auto-memory bundle ceiling 250 → 300 KB; project memory updated for Phase 5 / Sonnet 4.6 / wizard PLZ-gate |
| **B.4** | RLS second-account smoke test | ✓ done | `97b9207` | New `supabase/migrations/_smoke_tests/rls_second_account.sql` with 8 assertions (cross-user SELECT/UPDATE/DELETE/INSERT + owner-side append-only). SUPABASE_SETUP.md Step 8 walks through running it pre-prod |
| **C** | Model upgrade to Sonnet 4.6 | ✓ done | `7a7856f` | `MODEL = 'claude-sonnet-4-6'`. Pricing comment updated; rollback is a one-line revert. No 1M-context beta header to remove (function never sent one) |
| **D** | BayBO 2025/2026 verification (D.1–D.9) | ✓ done | `0cb875c` | 6 fixed/added (D.1, D.2, D.4, D.5, D.7, D.9), 2 already covered (D.3, D.8), 1 partial (D.6 — framing added, specific m³ thresholds deferred to Architect-stage). Full per-item table in `BAYBO_2026_VERIFICATION.md` |
| **E** | Process: docs + auto-memory | ✓ done | `0769b8c` | `docs/audits/2026-05-04/` houses AUDIT_REPORT, AUDIT_SUMMARY, CHAT_WORKSPACE_AUDIT. New `docs/README.md` indexes the directory and flags the still-missing MASTER_DOC.md / PHASE_3_BRIEF.md |

## Munich narrowing — final residue check

```bash
$ rg -ic 'erlangen' src/features/landing/ src/locales/
src/features/landing/lib/addresses.ts:5
src/features/landing/lib/chatScript.ts:1
```

**Six lines remaining**, all in code-comments or the non-exported `_DEPRECATED_ADDRESSES` archive constant:

| Line | What it is | Acceptable? |
|---|---|---|
| `src/features/landing/lib/addresses.ts:25` | Doc-comment explaining the post-Phase-5 narrowing | ✓ documentation |
| `src/features/landing/lib/addresses.ts:135-153` | `_DEPRECATED_ADDRESSES` non-exported archive (Erlangen + Rosenheim) | ✓ per sprint brief A.1 ("They can stay in a `_deprecated` exported constant for archival") |
| `src/features/landing/lib/chatScript.ts:12` | Doc-comment explaining the Erlangen → München pivot | ✓ documentation |

Zero user-visible Erlangen content remains. Sleeping engine artifacts (`legalContext/erlangen.ts`, `data/erlangen/`) untouched per the do-not-delete convention.

## D-phase BayBO findings (summary)

Per `BAYBO_2026_VERIFICATION.md`:

- **D.1 Stellplatzpflicht kommunalisiert (Art. 47)** — fixed, made explicit
- **D.2 Bauantrag direkt zur Bauaufsichtsbehörde (Art. 65)** — added
- **D.3 3-Wochen-Vollständigkeitsprüfung** — already in Art. 59 (Phase A.3) + reinforced in Art. 65
- **D.4 Verlängerung bis 4 Jahre (Art. 69)** — added
- **D.5 Sonderbau-Schwellen (Art. 2 Abs. 4)** — fixed (Verkaufsstätten 800 → 2.000 m², Gaststätten >60 ergänzt)
- **D.6 Verfahrensfreiheit erweitert** — partial (framing added, specific m³ deferred to Architekt:in)
- **D.7 Bau-Turbo + Art. 82c** — added with same discipline as § 246e
- **D.8 Freiflächengestaltung** — already covered for München in muenchen.ts (GBS § 3 ausgesetzt)
- **D.9 Spielplatzpflicht kommunalisiert** — added

`bayern.ts` grew 161 → 268 lines (+107). Composed prompt 10.9k → 12.6k tokens.

## Bundle stats

|  | Pre-sprint | Post-sprint |
|---|---|---|
| Main `index-*.js` raw | 836 KB | 842 KB (+0.7%) |
| Main `index-*.js` gzipped | 242 KB | **239 KB** |
| Verify-bundle ceiling | 300 KB | 300 KB |
| Locale keys (DE/EN parity) | 882 | **890** (+8: 5 outsideMunich + 3 offlineBanner) |
| Composed prompt tokens | ~10.9k | ~12.6k |

The bundle actually shrunk slightly despite the +236 LOC across the chat workspace — vite/rollup-managed chunking absorbed the new Banners + chatStore additions and the InputBar's two new branches without expanding the main chunk's compressed footprint.

## Token-cost smoke (3 conversations on Sonnet 4.6)

**NOT RUN** — token-cost A/B against Sonnet 4.5 requires hitting the live Edge Function with real conversations. The audit prompt (and this sprint) was static-analysis only. The Edge Function deploy is itself a deferred human task (see "Pre-launch human-task list" below).

Expectation per Anthropic's Sonnet 4.6 release notes: identical pricing, slightly fewer output tokens for the same task due to better instruction-following. If real-world cost-per-turn drifts > 10% in either direction, that's worth investigating; the cost ticker (admin-only, `CostTicker.tsx`) will surface the per-turn breakdown when Rutik runs the first few production turns.

## Open issues / deferred

| Item | Why deferred | Where it lives now |
|---|---|---|
| **MASTER_DOC.md / PHASE_3_BRIEF.md commit** | Files exist outside the repo (Notion / Drive); not available to me at audit time | Flagged in `docs/README.md` § "Conspicuously missing" |
| **Sonnet 4.6 token-cost A/B** | Requires live deploy + 3 sample conversations | Pre-launch task; cost ticker will surface when Rutik runs it |
| **D.6 specific m³ thresholds** | Anlage 1 BayBO numbers shift between revisions; legal review needed before publishing | `BAYBO_2026_VERIFICATION.md` § "Pre-launch human-task list" |
| **Legal review of all D.x BayBO claims** | Legal accuracy is a human-stage check, not a code-stage check | Same |
| **Edge Function redeploy (`supabase functions deploy chat-turn`)** | I don't have Supabase CLI credentials and shouldn't push to your prod project | Manual: run after pushing this branch |
| **Vercel push to prod** | I prepared 10 commits on `main` but did NOT `git push` — pushing to main triggers your Vercel deploy and that's a state-changing action that needs your explicit approval | Manual: `git push origin main` when ready |
| **Per-message "queued" badge in MessageUser** | Phase B.2 minimum-viable scope; the OfflineBanner queue-depth indicator is sufficient for v1 | Future polish |

## Pre-launch human-task list (NOT code)

These block public launch but are outside this sprint's scope:

- [ ] **Push the 10 commits to `origin/main`** to trigger the Vercel build. Suggest pushing via `git push origin main` after a manual review of the commit log; rollback is `git reset --hard 4ac4333`.
- [ ] **Redeploy the chat-turn Edge Function** (`supabase functions deploy chat-turn`) so the model upgrade + new BayBO content + new Art. 59/65/69/82c land in production.
- [ ] **Run the RLS smoke test** (`supabase/migrations/_smoke_tests/rls_second_account.sql`) against the production Supabase project before the first public visitor.
- [ ] **Have a German Bauingenieur or Fachanwalt für Bau- und Architektenrecht review** the post-2025 BayBO claims in `bayern.ts` (the `BAYBO_2026_VERIFICATION.md` § "Pre-launch human-task list" enumerates the five specific items to confirm).
- [ ] **Three sample conversations end-to-end** to verify Sonnet 4.6 holds the atelier register (Sie-discipline, one-specialist-per-turn, Art. 59 surfaces correctly when pushed toward Sonderbau territory).
- [ ] **DSGVO and AVV** for Anthropic (or pivot to Bedrock-EU) — contract task.
- [ ] **Legal pages** (Impressum / Datenschutzerklärung / AGB) — German lawyer task.
- [ ] **Production domain** — buy + DNS + Vercel attach.
- [ ] **Sentry / observability for production** — Sentry is wired (see `package.json`); needs a real DSN in env.

## Stop conditions

> "all phases A–E complete, `npm run build` clean, ESLint 0/0, locale parity green, manual smoke pass on the live preview"

| Stop condition | Status |
|---|---|
| Phases A–E complete | ✓ all 10 commits |
| `npm run build` clean | ✓ 734ms, 238.9 KB gz |
| ESLint 0/0 | ✓ silent |
| Locale parity green | ✓ 890 keys |
| Manual smoke on live preview | ⏳ pending push + redeploy + your verification of §8 of the sprint brief |

## §8 manual smoke (after push + deploy — for Rutik)

1. Visit landing URL → no Erlangen anywhere on the page (only the four München analyzer cards + the new chat demo).
2. Wizard with `Friedrichstraße 1, 10117 Berlin` → soft warning surfaces, primary CTA flips to "Adresse prüfen", click "Trotzdem fortfahren", project creates with `plot.outside_munich_acknowledged: true` in `projects.state.facts`.
3. Wizard with `Türkenstraße 25, 80799 München` → no warning, project creates, first specialist message references LBK München / StPlS 926.
4. Active conversation: type "Mehrfamilienhaus mit 80 Wohnungen, 6 Geschosse, gemischte Nutzung mit Verkaufsfläche 2.500 m²" → model should engage Art. 59 + Sonderbau threshold (Verkaufsstätten > 2.000 m²).
5. DevTools → Network → Offline. Send 2 messages. Banner shows "· 2 Nachrichten in Warteschlange". Reconnect. They flush in order.
6. *Vorläufig — bestätigt durch …* footer: identical wording in system-prompt-emitted recommendations, Top3 cards, exportPdf, exportMarkdown.
7. RLS: log in as user A, create project, log out, sign in as user B, paste A's project URL → calm 404.
