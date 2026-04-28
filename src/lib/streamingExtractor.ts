// ───────────────────────────────────────────────────────────────────────
// Phase 3.4 #52 — partial-JSON text-field extractor
//
// The Edge Function streams Anthropic's `input_json_delta` events as
// SSE frames. Each frame carries a fragment of the respond tool's
// input JSON. To render text progressively in the UI we need to pull
// out the value of a single string field (`message_de` or `message_en`,
// per the active locale) as bytes arrive.
//
// This is a tiny streaming JSON state machine — a few states, no
// dependencies, robust to chunks splitting anywhere (inside the field
// marker, mid-string, mid-escape, mid-`\uXXXX`).
//
// The model's tool input looks like:
//
//   {"specialist":"moderator","message_de":"Guten Tag …","message_en":"Hello …", …}
//
// We watch for the literal substring `"message_de":"` (or `"message_en":"`)
// to enter the string body, then accumulate characters until we hit an
// unescaped `"`. JSON escapes are translated as we go.
// ───────────────────────────────────────────────────────────────────────

type State = 'searching' | 'inside' | 'escape' | 'unicode'

export class TextFieldExtractor {
  private readonly marker: string
  private buffer = ''
  private state: State = 'searching'
  private unicodeBuf = ''

  /** @param fieldName e.g. `message_de` or `message_en`. */
  constructor(fieldName: string) {
    this.marker = `"${fieldName}":"`
  }

  /**
   * Feed a JSON-fragment chunk. Returns the newly-extracted user-visible
   * text (decoded from escapes). May return '' if the chunk landed
   * entirely inside metadata or pre-marker JSON.
   */
  feed(chunk: string): string {
    let out = ''
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i]
      this.buffer += ch

      if (this.state === 'searching') {
        // Optimisation: keep the buffer's tail at most marker.length so
        // we don't grow unboundedly while we're still scanning.
        if (this.buffer.length > this.marker.length) {
          this.buffer = this.buffer.slice(-this.marker.length)
        }
        if (this.buffer.endsWith(this.marker)) {
          this.state = 'inside'
          this.buffer = '' // marker matched — discard
        }
      } else if (this.state === 'inside') {
        if (ch === '\\') {
          this.state = 'escape'
        } else if (ch === '"') {
          // End of the target string. We don't go searching for another
          // copy — there's only one message field per response.
          this.state = 'searching'
        } else {
          out += ch
        }
      } else if (this.state === 'escape') {
        if (ch === 'n') {
          out += '\n'
          this.state = 'inside'
        } else if (ch === 't') {
          out += '\t'
          this.state = 'inside'
        } else if (ch === 'r') {
          // skip CR — JSON allows but DOM rendering doesn't need it
          this.state = 'inside'
        } else if (ch === '"' || ch === '\\' || ch === '/') {
          out += ch
          this.state = 'inside'
        } else if (ch === 'b') {
          this.state = 'inside'
        } else if (ch === 'f') {
          this.state = 'inside'
        } else if (ch === 'u') {
          this.state = 'unicode'
          this.unicodeBuf = ''
        } else {
          // Unknown escape — emit the char raw and recover gracefully.
          out += ch
          this.state = 'inside'
        }
      } else if (this.state === 'unicode') {
        this.unicodeBuf += ch
        if (this.unicodeBuf.length === 4) {
          const cp = parseInt(this.unicodeBuf, 16)
          if (!Number.isNaN(cp)) {
            out += String.fromCodePoint(cp)
          }
          this.unicodeBuf = ''
          this.state = 'inside'
        }
      }
    }
    return out
  }
}
