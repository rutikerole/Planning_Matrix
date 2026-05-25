// ───────────────────────────────────────────────────────────────────────
// v1.0.29.2 — smoke:chat-ux. Unit-asserts the PURE chat-UX decision logic
// extracted from the C2-C5 fixes. The bugs themselves (auto-scroll position,
// chip overlap, sidebar highlight) are DOM/visual and confirmed by Rutik's
// smoke walk — this gate locks the deterministic decision functions so they
// can't silently regress.
//
// Exit 0 if all pass; 1 if any fail.
// ───────────────────────────────────────────────────────────────────────

import {
  shouldFollowStreamOnStart,
  chipsVisible,
  liveStageForSpecialist,
  inputZoneReserve,
  STREAM_FOLLOW_THRESHOLD_PX,
  INPUT_ZONE_BREATHING_PX,
} from '../src/features/chat/lib/chatUxDecisions.ts'

let passed = 0
let failed = 0
function ok(cond: boolean, msg: string): void {
  if (cond) {
    console.log(`  ✓ ${msg}`)
    passed++
  } else {
    console.log(`  ✗ ${msg}`)
    failed++
  }
}

console.log('\n[smoke-chat-ux] Bug 84 — shouldFollowStreamOnStart (near-live-edge gate)…')
ok(shouldFollowStreamOnStart(0) === true, 'at bottom (0px) → follow')
ok(shouldFollowStreamOnStart(STREAM_FOLLOW_THRESHOLD_PX) === true, `at threshold (${STREAM_FOLLOW_THRESHOLD_PX}px) → follow`)
ok(shouldFollowStreamOnStart(STREAM_FOLLOW_THRESHOLD_PX + 1) === false, 'just beyond threshold → do NOT follow (user scrolled up)')
ok(shouldFollowStreamOnStart(1000) === false, 'far up (1000px) → do NOT follow')

console.log('\n[smoke-chat-ux] Bug 86 — chipsVisible (hide while composing)…')
ok(chipsVisible(false, false) === true, 'idle → chips visible')
ok(chipsVisible(true, false) === false, 'thinking → chips hidden')
ok(chipsVisible(false, true) === false, 'streaming → chips hidden')
ok(chipsVisible(true, true) === false, 'thinking + streaming → chips hidden')

console.log('\n[smoke-chat-ux] Bug 87 — liveStageForSpecialist (sidebar single-source)…')
// The exact screenshot scenario: persona speaks "Adjacent rules" (sonstige_vorgaben).
ok(liveStageForSpecialist('sonstige_vorgaben') === 'sonstige_vorgaben',
  'speaker sonstige_vorgaben → "Other regulations" stage (NOT "Procedure synthesis")')
ok(liveStageForSpecialist('verfahren') === 'verfahren', 'speaker verfahren → verfahren stage')
ok(liveStageForSpecialist('moderator') === 'project_intent', 'speaker moderator → project_intent (first moderator stage)')
ok(liveStageForSpecialist('synthesizer') === 'final_synthesis', 'speaker synthesizer → final_synthesis')
ok(liveStageForSpecialist(null) === null, 'no speaker → null (fall back to state-based live)')

console.log('\n[smoke-chat-ux] Bug 85 — inputZoneReserve (dynamic reserve sizing)…')
// Layout-math trace (no DOM render available): worst-case mobile input zone vs
// the old fixed 200px constant.
const OLD_FIXED = 200
const desktop1Row = 144 // 1-row Yes/No chips + 1-row textarea + inner padding
const mobileStacked = 276 // 2-row stacked chips + 3-row textarea + IDK hint + padding
ok(inputZoneReserve(desktop1Row).padBottom === desktop1Row + INPUT_ZONE_BREATHING_PX,
  `desktop 1-row (${desktop1Row}px) → padBottom ${desktop1Row + INPUT_ZONE_BREATHING_PX}`)
ok(inputZoneReserve(desktop1Row).marginTop === -desktop1Row, 'desktop 1-row → marginTop = -height')
ok(inputZoneReserve(mobileStacked).padBottom === mobileStacked + INPUT_ZONE_BREATHING_PX,
  `mobile stacked (${mobileStacked}px) → padBottom ${mobileStacked + INPUT_ZONE_BREATHING_PX}`)
ok(mobileStacked > OLD_FIXED,
  `mobile stacked (${mobileStacked}px) EXCEEDED the old fixed ${OLD_FIXED}px by ${mobileStacked - OLD_FIXED}px → was hidden; dynamic reserve clears it`)
ok(inputZoneReserve(mobileStacked).padBottom - inputZoneReserve(mobileStacked).marginTop * -1 === INPUT_ZONE_BREATHING_PX,
  `reserve keeps ${INPUT_ZONE_BREATHING_PX}px breathing above the zone at any height`)

console.log(`\n[smoke-chat-ux] ${passed} passed · ${failed} failed`)
if (failed > 0) {
  console.error('[smoke-chat-ux] FAIL')
  process.exit(1)
}
console.log('[smoke-chat-ux] OK')
