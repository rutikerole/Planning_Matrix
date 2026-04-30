// Phase 7 — chat-turn driver. Calls the deployed Edge Function in
// non-streaming mode (Accept: application/json) for predictable
// JSON-envelope responses. Sequential, 2 s spacing — well under the
// 50 turns/hour rate limit from migration 0008.
//
// First turn convention: send userMessage=null so the function
// synthesizes a kickoff "user" turn internally and the moderator
// opens the conversation. Subsequent turns send the script's
// userMessage.
//
// We DO NOT use Accept: text/event-stream — non-streaming is
// strictly simpler to parse, equally accurate (the Edge Function
// runs the same persistence path either way), and avoids dragging
// SSE-frame parsing into the harness.

import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'

const TURN_SPACING_MS = 2_000

async function postOneTurn(config, accessToken, projectId, payload) {
  const url = `${config.SUPABASE_URL}/functions/v1/chat-turn`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: config.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      projectId,
      clientRequestId: randomUUID(),
      locale: 'de',
      ...payload,
    }),
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error(`chat-turn returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`)
  }
  if (!body.ok) {
    const code = body.error?.code ?? 'unknown'
    const msg = body.error?.message ?? '(no message)'
    throw new Error(`chat-turn ${code}: ${msg} (HTTP ${res.status})`)
  }
  return body
}

// ─── Run a multi-turn conversation against a single test project ──────
//
// Returns:
//   {
//     transcript: [{ specialist, message_de, completionSignal, ... }, ...],
//     finalProjectState,
//     totals: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, latencyMs }
//   }

export async function runConversation({ config, accessToken, projectId, script }) {
  const transcript = []
  const totals = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, latencyMs: 0 }
  let finalProjectState = null

  // Turn 0 — priming. No userMessage → the function synthesizes a
  // kickoff and the moderator opens the conversation.
  let response = await postOneTurn(config, accessToken, projectId, {
    userMessage: null,
    userAnswer: null,
  })
  transcript.push(response.assistantMessage)
  finalProjectState = response.projectState
  accumulate(totals, response.costInfo)

  // Subsequent turns — one per script entry.
  for (let i = 0; i < script.length; i++) {
    await sleep(TURN_SPACING_MS)
    const userMessage = script[i].userMessage
    response = await postOneTurn(config, accessToken, projectId, {
      userMessage,
      userAnswer: null,
    })
    transcript.push(response.assistantMessage)
    finalProjectState = response.projectState
    accumulate(totals, response.costInfo)
  }

  return { transcript, finalProjectState, totals }
}

function accumulate(totals, costInfo) {
  if (!costInfo) return
  totals.inputTokens += costInfo.inputTokens ?? 0
  totals.outputTokens += costInfo.outputTokens ?? 0
  totals.cacheReadTokens += costInfo.cacheReadTokens ?? 0
  totals.cacheWriteTokens += costInfo.cacheWriteTokens ?? 0
  totals.latencyMs += costInfo.latencyMs ?? 0
}
