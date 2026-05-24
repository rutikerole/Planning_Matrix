# v1.0.27 BRUTAL HONESTY REPORT

**Date:** 2026-05-24 · **HEAD:** `ed55918` (tag v1.0.27) · **Bayern SHA:** `b18d3f7f…3471` MATCH (start + end of pass)
**Mode:** read + test, no live prod calls, no live DB writes. Static trace + offline render + mock smoke + PDF rasterization (poppler available).
**Artifacts for Rutik:** `/tmp/c11_audit/` — 32 rendered PDFs (`<state>-<de|en>.pdf`), full text dumps (`.txt`), `SCAN_TABLE.md`, and 4 inspection PNGs.

---

## TL;DR — ship status

### 🟢 PROVEN GREEN (with evidence)
- **All offline gates, clean re-run:** verify:bayern-sha MATCH · build exit 0 · verify:locales 1433 keys parity · verify:hardcoded-de 0 hits · verify:legal-config OK · verify:bundle 277.0 KB gz (ceiling 300) · smoke:pdf-text 276/0 · smoke:pdf-matrix 16/16 · smoke:citations OK · smoke:architect 29/0.
- **16-state PDF render (32 renders, DE+EN):** zero `undefined` / `NaN` / `[object Object]` / standalone-`null` / `€0` tokens; all 12 pages; substantive states cite real multiple §§, stubs carry honest "in Vorbereitung", none fabricated. Evidence: `/tmp/c11_audit/SCAN_TABLE.md`.
- **Visual (rasterized + eyeballed):** NRW cover, Sachsen cost page, Hamburg (Stadtstaat) cover — clean layout, no overlap/truncation; `ü/ß/±/m²/≈/·` all render correctly (the `±` in "regionale Varianz ±10%" verified as U+00B1 in the text layer, `c2 b1` hexdump — a 90-DPI raster artifact only, renders fine at 150 DPI).
- **Client wiring (PROVEN-BY-CODE):** invite CTA (`ResultFooter.tsx:103-110`), `createArchitectInvite` (`architectInviteApi.ts`, 12 mock assertions), `InviteArchitectModal`, `AcceptInvite.tsx` accept path, focus-poll reactivity (`useVerificationReactivity.ts`).
- **i18n:** 20/20 new v1.0.27 keys present in both locales, `{{name}}/{{acceptUrl}}/{{expiry}}` placeholder parity confirmed, 40/40 random sample OK, no untranslated-EN strings.
- **Verify ("Bestätigen") path:** works **even with the un-redeployed verify-fact** (the old function already sets DESIGNER+VERIFIED for the default path).

### 🟡 CODE-COMPLETE-UNVALIDATED (needs Rutik's live walk)
- **Realtime owner footer** — `useVerificationReactivity.ts:48-69` subscribes to `projects` UPDATE; migration 0035 is applied, but the live channel delivery is **untested by me** (no prod access). Focus-poll fallback IS code-proven.
- **Full legal-shield e2e** — invite → accept → verify → footer clears → reject → reverts → owner-edit erosion. Static-traced green; never run live.

### 🔴 BROKEN IN PROD RIGHT NOW (deploy-gated — the headline findings)
- **🔴 REJECT IS INVERTED until `verify-fact` is redeployed.** The *deployed* verify-fact (pre-this-sprint) does **not** read `body.action` — `git show v1.0.24:supabase/functions/verify-fact/index.ts:217-225` unconditionally builds `quality:'VERIFIED'`. The live v1.0.27 frontend sends `{action:'reject', reason}`; the stale function ignores `action` and **VERIFIES the item instead of rejecting it** — the exact opposite. Clicking "Ablehnen" today corrupts state.
- **🔴 EROSION (Bug 32 half) DOES NOT FIRE until `chat-turn` is redeployed.** `erodeVerificationOnEdit` lives only in `src/lib/projectStateHelpers.ts:352`, called via `applyExtractedFacts:397` ← `applyToolInputToState:712` ← `chat-turn/index.ts:582`. It is **bundled into the Deno chat-turn at deploy time**, and the SPA does **not** apply it client-side (grep: only Deno + the module reference it). The deployed chat-turn carries the old helper → owner edits to a verified fact do **not** downgrade it. **Rutik flagged only verify-fact redeploy — chat-turn redeploy was missing from the handoff** (now corrected in HANDOFF.md).

### ⬛ DEFERRED (sourced-data-gated — confirmed still open, not regressions)
- **Bug 35 / cost not state-differentiated** — CONFIRMED: NRW and Sachsen (and all states) render **identical** € figures (€ 24.700–46.200 total). Disclosed honestly via "deutscher Basiswert (regionale Varianz ±10%; …in Vorbereitung)" — not fabrication, but a manager will notice identical costs across states. (C11_DATA_GAPS GAP-3.)
- **Bug 27 München calendar** — generic-label, no token leak (C11_DATA_GAPS GAP-1).
- **Risk Register + Vorhabensbeschreibung** — CONFIRMED ABSENT from all PDFs (0 hits, both states). BACKLOG features, never built. Not a regression.
- **11 stub states' real §§ / chamber / authority names** — generic placeholders ("Landesbauordnung {Land}", "{Land}-Architektenkammer", "Denkmalschutzgesetz {Land}"), honest-by-disclosure.

### BLOCKER FIXES LANDED
None. The two 🔴 items are **deploy** issues, not code bugs — the code is correct; the Edge Functions are stale. No surgical code fix applies. One doc honesty-fix to HANDOFF.md (added the chat-turn redeploy requirement).

---

## 16-state matrix deep audit

**Tier 1 — substantive (bayern, nrw, bw, hessen, niedersachsen):** real multi-§ citations render —
NRW `§ 62/64/67/68/70 BauO NRW`; BW `§ 43/50/52/58/73a LBO`; Hessen `§ 49/63/65/66/68 HBO`; NDS `§ 60/63/64/65/65a NBauO`; Bayern `BayBO` (T-03 verified fixture). NRW shows real regional monument authorities (LVR/LWL). Costs render (€ baseline). No fabrication.

**Tier 2 — Flächenland stubs (sachsen, brandenburg, thueringen, sachsen-anhalt, rlp, saarland, sh, mv):** no §; honest "in Vorbereitung"/"being finalized" present (8/8); generic placeholder chamber/authority/code ("Landesbauordnung {Land}", "{Land}-Architektenkammer", "Denkmalschutzgesetz {Land}") — disclosed as not-yet-wired. No fabricated statute.

**Tier 3 — Stadtstaat (berlin, hamburg, bremen):** render structurally identical to Flächenländer; cityBlock=null path does **not** crash; honest framing present; Hamburg cover visually verified clean.

**Cross-cutting:** cost figures **identical across all 16** (Bug 35, disclosed). Risk Register + Vorhabensbeschreibung **absent everywhere**. Per-page footer = "VORLÄUFIG — Architekt:in-Bestätigung ausstehend" on all (correct — no fixture is fully verified, so the Bug-33 flip never triggers; the flip code's else-branch is byte-identical → matrix stays 16/16).

**Verdict: 16/16 green, 0 content bugs found beyond the known-deferred data gaps.**

---

## Architect flow static trace (8 steps)

| # | Step | Verdict | Evidence / hole |
|---|---|---|---|
| 1 | Result → "Invite architect to verify" CTA | PROVEN-BY-CODE | `ResultFooter.tsx:103-110` (emerald CTA) → `InviteArchitectModal`; i18n DE+EN present |
| 2 | createArchitectInvite → share-project CREATE | PROVEN-BY-CODE | `architectInviteApi.ts`; 12 mock assertions (smoke:architect); handles 401/403/404/500 |
| 3 | acceptUrl + mailto rendered | PROVEN-BY-CODE | `InviteArchitectModal.tsx` — `/architect/accept?token=…`, copy + mailto + locale expiry |
| 4 | /architect/accept → share-project ACCEPT | PROVEN-BY-CODE (client); REQUIRES-RUNTIME (share-project) | `AcceptInvite.tsx:46,131`; UUID-guarded, sign-in redirect, expired→403 shown. share-project **unchanged this sprint → relies on Phase-13 deploy** |
| 5 | Architect "Bestätigen" → verify-fact verify | PROVEN-BY-CODE (client); WORKS with stale fn | `VerificationPanel.tsx`, `verifyFactClient.ts`; old + new verify-fact both set VERIFIED for default path |
| 6 | Owner footer updates | PROVEN-BY-CODE (focus-poll); REQUIRES-RUNTIME (realtime) | `useVerificationReactivity.ts`; focus invalidates `['project',id]`; realtime needs 0035 (applied) + live channel (untested) |
| 7 | Architect "Ablehnen" → reject | **🔴 HOLE — DEPLOY-GATED + INVERTED** | client correct (`VerificationPanel` reason≥5 + `action:'reject'`); **deployed verify-fact ignores action → verifies instead.** Needs redeploy |
| 8 | Owner edits verified fact → erosion downgrade | **🔴 HOLE — DEPLOY-GATED** | code correct (`projectStateHelpers.ts:352,397`); **deployed chat-turn lacks it; SPA doesn't apply it.** Needs chat-turn redeploy |

**6 steps PROVEN / code-correct · 2 steps DEPLOY-GATED HOLES (steps 7, 8).**

---

## Edge cases (17 traced)

**Safe / handled (code-proven):** expired token → 403 surfaced (`AcceptInvite`/share-project:341); non-designer accept → 403 "role=designer" message; double-click "Invite" → react-query dedups same-key query, no double INSERT in-session; 2 tabs → 2 realtime channels, **both cleaned on unmount** (`useVerificationReactivity:66` removeChannel) — not a leak; logged-out invite → `architectInviteApi` throws `unauthenticated`; reject-without-reason → client disables confirm until ≥5 chars (`VerificationPanel`).

**Risky / UNVALIDATED:**
- **Reject without redeploy → INVERTS to verify** (step 7) — highest severity.
- **Owner edit without chat-turn redeploy → no erosion** (step 8).
- **Reason guard is client-only until redeploy:** the server-side `reason ≥ 5` check is in the un-deployed verify-fact; pre-redeploy the reject is inverted anyway, so moot until redeploy — but post-redeploy both layers exist.
- **Multi-reload invite accumulation (minor):** react-query cache (`staleTime/gcTime: Infinity`) prevents duplicate invites within a session, but a page **reload** then re-open mints a NEW `project_members` row (old one orphaned, expires in 7d). Not corrupting; rows accumulate. Low severity.
- **Worst-case footer staleness:** realtime down + tab never refocused → owner sees stale verification until a focus event or reload. Acceptable; focus-poll bounds it.
- **Race: owner edits while architect verifies same field** — last-write-wins on `projects.state` (verify-fact service-role UPDATE vs chat-turn RPC); no row-level locking. UNVALIDATED — low probability, but two writers to one JSONB column. Flag for live observation.

---

## Regression-guard verdict

| Guard | Asserting what it claims? |
|---|---|
| verify:bayern-sha | YES — SHA of composed prefix, exact-match |
| smoke:pdf-matrix (16×2) | YES — teeth proven (fires on `§ 65 BauO Sachsen`, München leak; passes legit) |
| smoke:pdf-text (276) | YES — real content/ligature/parity assertions |
| smoke:architect (29) | YES — parseInviteResponse (happy+errors), rollup (0/partial/all), erosion (change/same/non-verified) all non-vacuous |
| verify:locales | KEY parity only — VALUE quality NOT gated (covered manually this pass: clean) |

**Coverage GAPS (vibes, not gated):** the reject Edge-Function path (Deno — no tsx smoke), the realtime subscription delivery (runtime), the live e2e flow. These are inherently un-unit-testable here → Rutik's smoke walk is the only validation.

---

## Recommended actions BEFORE Rutik's smoke walk

**🔴 MUST DO (or the flow malfunctions):**
1. **Redeploy `verify-fact`** (`supabase functions deploy verify-fact`) — otherwise "Ablehnen" **verifies instead of rejects** (inverted state corruption).
2. **Redeploy `chat-turn`** (`supabase functions deploy chat-turn`) — otherwise owner-edit **erosion never fires** (stale verification persists). *(This was missing from the handoff.)*
3. **Confirm Vercel deployed the v1.0.27 frontend** (the invite CTA / modal / reject button / reactivity). If not deployed, none of C7/C8 is reachable yet; if deployed while the Edge Functions are stale, reject is actively inverted.

**🟡 SHOULD DO during the walk (prioritized):**
1. Full e2e with `erolerutik7@gmail.com` (designer): owner invite → copy link → accept → **verify** (expect footer clears) → **reject** (expect footer reverts; only after step-1 redeploy) → owner-edit a verified fact (expect downgrade; only after step-2 redeploy).
2. Open the 3 sample PDFs in `/tmp/c11_audit/` (`nrw-de`, `sachsen-de`, `hamburg-de`) for a human pixel pass beyond my raster.
3. Manually expire a `project_members.expires_at` and confirm the accept page shows the expired message.

**⬛ DON'T bother (already gate-covered):** per-state fabrication / Bayern-leak / ligature / DE-EN parity (smoke:pdf-matrix 16/16), invite response mapping + rollup + erosion logic (smoke:architect 29/0), bundle size, locale key parity.

---

## v1.0.28 candidate list (P0/P1 from this pass)

- **P0** — operationalize Edge-Function deploys: a `supabase functions deploy` step (or a deploy checklist gate) so reject/erosion code can't ship "green" while the functions are stale. This split is the root cause of the two 🔴s.
- **P1** — Bug 35 cost state-differentiation (needs sourced BKI; identical € across states is the most visible "smells wrong" item for a manager).
- **P1** — Risk Register + Vorhabensbeschreibung PDF sections (absent; BACKLOG features).
- **P2** — editorial-page center-footers don't flip in the all-verified end-state (Bug 33 scoped follow-up); architect dashboard "re-verification needed" badge after erosion.
- **P2** — cost subtitle "Berechnet ausschließlich aus Wohnfläche" renders even when the project has no Wohnfläche fact (honesty nuance — reads as computed-from-data when it's a fixed baseline).
- **P3** — orphaned invite-row accumulation on reload; two-writer race on `projects.state`.

---

## Verdict

**🟡 — with a 🔴 asterisk.** The offline surface and the v1.0.27 client code are **PROVEN GREEN**; the 16-state PDF matrix is genuinely clean (no content bugs beyond known-deferred data gaps). **BUT** the two server-dependent features (reject, erosion) are **BROKEN in prod until two Edge-Function redeploys** — and reject is not merely broken, it is **inverted** (verifies on reject). The architect-flow e2e is **🔴 until `verify-fact` + `chat-turn` are redeployed**, then **🟡 pending Rutik's live validation**. No code is wrong; the gap is deploy state — exactly what the automated gates cannot see.

*Bayern SHA verified MATCH at session start and end. No production code modified.*
