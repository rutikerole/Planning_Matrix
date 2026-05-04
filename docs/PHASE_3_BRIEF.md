# Phase 3 — The Chat Core

> **The heart of Planning Matrix begins here.** Auth and dashboard are scaffolding. *This* is the product.
> Codename: **Neo's first conversation.**

---

## 0. The mission, in one paragraph

Build the conversational core of Planning Matrix. A user clicks "New project" on the dashboard and walks through a focused two-question initialization wizard (I-01: *what are you building*, I-02: *do you have a plot*), at which point the system selects a template, instantiates a project, and lands the user inside a **chat workspace** that should not feel like a chat app at all. It should feel like the user has just been seated at a roundtable with a German architect, a zoning lawyer, a building-code engineer, and a Bauamt officer. The conversation that follows is dynamic — every question is generated based on the project state and the gap that matters most next. The user can answer, say "I don't know," and the system either researches it, marks it as assumed, or parks it. As the conversation progresses, a live panel on the right populates with the top-3 next steps and a master checklist of permits, documents, and specialists. The output is not a final report at the end — it crystallizes in front of the user's eyes throughout the conversation.

**ultrathink mode on. Surgical precision. Full creative authority within the locked design system. This is the most important phase of the entire build. Do not rush. Do not cut corners. Take the time it actually takes.**

---

## 1. What is already shipped (do not touch)

- **Phase 0:** Vite + React + TS scaffold, Tailwind v3 + shadcn v2, i18n (DE/EN), TanStack Query, Zustand, RHF + Zod, Lenis, Framer Motion, Vaul.
- **Phase 1 → 1.6:** Landing page at `/`. Cinematic, atmospheric, manager-approved. Eight curated photographs in `/public/images/`. Locked design system: Instrument Serif + Inter, warm paper / ink / muted clay, calm earned motion gated by `prefers-reduced-motion`.
- **Phase 2:** Supabase auth — sign up, sign in, forgot/reset password, email verification, protected routes, dashboard placeholder at `/dashboard` ("Welcome, {name}. New project — coming soon.").

You are starting from a working `/dashboard` with an authenticated CLIENT user, an empty button labeled `New project — coming soon`, and a sign-out flow. Your job: make that button real, and build everything that flows from it.

---

## 2. Locked decisions (do not relitigate)

| Decision | Choice | Why |
|---|---|---|
| LLM provider | **Anthropic API** (Claude Sonnet 4.5 — model string `claude-sonnet-4-5`) | Best instruction-following for structured + multilingual output. |
| API key handling | **Supabase Edge Function proxy** | Never expose API key to the client. Auth-gated. Streamable. |
| State persistence | **Supabase Postgres** | We're already there. RLS keeps tenants isolated. |
| Languages | **DE primary, EN fallback** | Every system-generated message in both. |
| User role for v1 | **CLIENT only** | Designer/Engineer/Authority surfaces are later phases. |
| Bundesland for v1 | **Bayern** | One state. Reference law: BayBO + BauGB + BauNVO. |
| Templates fully fleshed in v1 | **T-01 (Einfamilienhaus Neubau) only** | Other templates exist as stubs that route into T-01 with annotations. |
| Output format | **Live, in-thread + persistent right rail** | Not "answer at the end." Recommendations crystallize as the conversation progresses. |
| Streaming vs typewriter | **Typewriter animation on completed responses** | Cleaner state management. Feels alive without the streaming complexity. |
| Voice attribution | **Specialist tags above messages** | "● PLANUNGSRECHT" small caps clay dot. The roundtable feel. |

These are locked. Do not propose alternatives. Build to these.

---

## 3. Mandatory research phase before writing a line of code

You have web access. **Use it.** Spend real time on this. The output of this phase is a written plan you share with Rutik and wait for confirmation on.

### 3.1 Anthropic API — current state of the art (April 2026)

- Read https://docs.claude.com/en/api/messages and https://docs.claude.com/en/docs/build-with-claude/tool-use thoroughly. The model string is `claude-sonnet-4-5`. Use the messages API.
- Study **structured output via tool use**: define a single tool the model is forced to call. The tool schema *is* our response schema.
- Study **system prompts** — multi-block system prompts let us cache the heavy parts (specialist personas, template knowledge) and only send the dynamic state per turn.
- Study **prompt caching** — we will reuse a long system prompt across many turns. Cache it.
- Study **rate limits and error codes** — we need to handle 429, 529 (overload), 500s gracefully.
- Look up cost: input token / output token / cache-read pricing for Sonnet 4.5. We will budget and surface this.

### 3.2 Supabase Edge Functions

- Read https://supabase.com/docs/guides/functions. Deno runtime.
- Study how to verify the user's JWT inside an Edge Function (we want auth-gated calls).
- Study secret management — `ANTHROPIC_API_KEY` is a Supabase Function secret, never in client code, never in the repo.
- Study response streaming from Edge Functions. We are NOT streaming Anthropic for v1, but the Edge Function does need to return the full Anthropic response cleanly.

### 3.3 Chat / conversational UI references

Spend real time on each. Note layout, message rhythm, attribution patterns, input affordances, motion philosophy.

- **Claude.ai itself** — the calmest chat UI on the market. Study how messages enter, how the input bar behaves, how the model's "thinking" is communicated.
- **Perplexity Pro** — left rail (discover), center thread, right rail (sources). Closest layout reference for our three-zone design.
- **Linear's command palette and triage views** — how a focused workspace feels.
- **Notion AI** — subtle integration, no chat-app aesthetic.
- **Apple Intelligence in Mail/Notes (macOS Sequoia / iOS 18+)** — how AI presence is communicated subtly.
- **Granola.ai, Cleft, Reflect** — quiet, calm AI tooling.
- **Figma's FigJam AI / FigGPT** — design-conscious AI surfaces.
- **Vercel v0** — clean LLM interaction, small thoughtful details.
- **Replit's Agent UI** — long-running tasks with live status.

For each: take a screenshot or note the specific patterns that translate to our brand. Don't copy. Steal the *thinking*.

### 3.4 German B2B tone for AI products

- Search for serious German AI product copy (Aleph Alpha, DeepL Pro, Personio AI). Note the formal "Sie" register, restraint, no exclamation marks, no emoji.
- The specialists never say "Hi!" — they say "Guten Tag" or open with substance directly.

### 3.5 German building law specifics needed for v1 (Bayern + Einfamilienhaus)

You don't need to be a lawyer, but the model does need real grounding. Look up:
- **BauGB §§30, 34, 35** — the three planungsrechtliche regimes (qualifizierter B-Plan, Innenbereich, Außenbereich)
- **BayBO Art. 2** — Gebäudeklassen
- **BayBO Art. 57** — Genehmigungsfreistellung
- **BayBO Art. 58** — Vereinfachtes Baugenehmigungsverfahren
- **BayBO Art. 59** — Baugenehmigungsverfahren
- Typical document requirements: Lageplan, Bauzeichnungen, Baubeschreibung, Standsicherheitsnachweis, Brandschutznachweis, Wärmeschutznachweis (GEG), Stellplatznachweis
- Typical Fachplaner roles: Tragwerksplaner, Brandschutzplaner, Energieberater, Vermesser

This grounding goes into the system prompt. The model already knows most of it but priming with the specifics keeps answers tight and project-relevant.

### 3.6 Output of the research phase

Write a **PLAN.md** (delete after confirmation, don't commit) covering:

1. Edge Function architecture diagram (auth flow, request shape, response shape)
2. Database schema (tables, columns, RLS policies, indexes)
3. The two-question wizard flow (screens, transitions, validation)
4. The chat workspace layout (three-zone wireframe, mobile collapses)
5. The specialist persona system (names, voices, attribution rules)
6. The question-generation system prompt (full draft text in DE)
7. The structured-output tool schema
8. State management plan (Zustand slices, TanStack Query keys, optimistic update strategy)
9. Edge case list (the full ~40 from §15 plus any you identify)
10. File / folder structure
11. Commit sequence
12. Open questions you want Rutik to decide before you build

**Share PLAN.md with Rutik. Wait for confirmation. Then build.**

---

## 4. Backend — Supabase schema & Edge Function

### 4.1 Database schema

Migration file: `supabase/migrations/0002_planning_matrix_core.sql`. Apply via Supabase SQL editor. Document so it can be replayed on a fresh project.

```sql
-- ================================================================
-- Planning Matrix — Core Schema (v1)
-- One Bundesland (Bayern), one fully-fleshed template (T-01).
-- ================================================================

-- Projects: one row per user-created project.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,

  -- Initialization answers (I-01, I-02)
  intent text not null check (intent in (
    'neubau_einfamilienhaus',
    'neubau_mehrfamilienhaus',
    'sanierung',
    'umnutzung',
    'abbruch',
    'sonstige'
  )),
  has_plot boolean not null,
  plot_address text,        -- nullable; only set when has_plot = true
  bundesland text not null default 'bayern',

  -- Resolved template
  template_id text not null check (template_id in ('T-01','T-02','T-03','T-04','T-05')),

  -- Display
  name text not null,
  status text not null default 'in_progress' check (status in (
    'in_progress','paused','archived','completed'
  )),

  -- Project state — single JSONB blob for v1.
  -- Shape documented in src/types/projectState.ts.
  -- Houses: key facts (with qualifiers), procedures, documents,
  -- roles, recommendations, area qualifiers (A/B/C).
  state jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_idx on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;

create policy "owner can select projects"
  on public.projects for select using (auth.uid() = owner_id);
create policy "owner can insert projects"
  on public.projects for insert with check (auth.uid() = owner_id);
create policy "owner can update projects"
  on public.projects for update using (auth.uid() = owner_id);
create policy "owner can delete projects"
  on public.projects for delete using (auth.uid() = owner_id);

-- Messages: append-only conversation log per project.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,

  role text not null check (role in ('user','assistant','system')),
  specialist text check (specialist in (
    'moderator','planungsrecht','bauordnungsrecht','sonstige_vorgaben',
    'verfahren','beteiligte','synthesizer'
  )),

  content_de text not null,    -- canonical message text
  content_en text,             -- translated mirror (assistant only)

  -- For assistant messages: input affordance offered alongside this message
  input_type text check (input_type in (
    'text','yesno','single_select','multi_select','address','none'
  )),
  input_options jsonb,         -- options for select types
  allow_idk boolean default true,

  -- For user messages: the structured answer if applicable
  user_answer jsonb,

  -- Audit
  model text,                  -- claude-sonnet-4-5 etc.
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  latency_ms int,

  created_at timestamptz not null default now()
);

create index messages_project_idx on public.messages (project_id, created_at);

alter table public.messages enable row level security;

create policy "owner can select messages"
  on public.messages for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );
create policy "owner can insert messages"
  on public.messages for insert with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- Project events: audit log for state mutations (qualifier changes, etc.)
create table public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,

  event_type text not null,    -- e.g. 'fact_added', 'qualifier_changed', 'recommendation_updated'
  before_state jsonb,
  after_state jsonb,
  reason text,
  triggered_by text not null,  -- 'user' | 'assistant' | 'system'

  created_at timestamptz not null default now()
);

create index project_events_project_idx on public.project_events (project_id, created_at desc);

alter table public.project_events enable row level security;
create policy "owner can select events"
  on public.project_events for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );
create policy "owner can insert events"
  on public.project_events for insert with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- updated_at trigger for projects
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
```

### 4.2 Project state shape (TypeScript, source of truth)

Add `src/types/projectState.ts`:

```ts
// ============================================================
// Planning Matrix — Project State Shape (v1)
// This is the JSONB blob stored in projects.state.
// ============================================================

export type Source = 'LEGAL' | 'CLIENT' | 'DESIGNER' | 'AUTHORITY';
export type Quality = 'CALCULATED' | 'VERIFIED' | 'ASSUMED' | 'DECIDED';
export type AreaState = 'ACTIVE' | 'PENDING' | 'VOID';

export interface Qualifier {
  source: Source;
  quality: Quality;
  setAt: string;       // ISO timestamp
  setBy: 'user' | 'assistant' | 'system';
  reason?: string;     // why ASSUMED / why VOID etc.
}

export interface Fact {
  key: string;         // e.g. "plot.area_sqm"
  value: unknown;      // typed by key in code
  qualifier: Qualifier;
  evidence?: string;   // cited source if applicable
}

export interface Procedure {
  id: string;          // e.g. "P-01-Genehmigungsfreistellung"
  title_de: string;
  title_en: string;
  status:
    | 'nicht_erforderlich'
    | 'erforderlich'
    | 'liegt_vor'
    | 'freigegeben'
    | 'eingereicht'
    | 'genehmigt';
  rationale_de: string;
  rationale_en: string;
  qualifier: Qualifier;
}

export interface DocumentItem {
  id: string;          // e.g. "D-Lageplan"
  title_de: string;
  title_en: string;
  status: Procedure['status'];
  required_for: string[];   // procedure ids
  produced_by: string[];    // role ids
  qualifier: Qualifier;
}

export interface Role {
  id: string;          // e.g. "R-Tragwerksplaner"
  title_de: string;
  title_en: string;
  needed: boolean;
  rationale_de: string;
  qualifier: Qualifier;
}

export interface Recommendation {
  id: string;
  rank: number;        // 1..n; top-3 are rank 1..3
  title_de: string;
  title_en: string;
  detail_de: string;
  detail_en: string;
  ctaLabel_de?: string;
  createdAt: string;
}

export interface Areas {
  A: { state: AreaState; reason?: string };  // Planungsrecht
  B: { state: AreaState; reason?: string };  // Bauordnungsrecht
  C: { state: AreaState; reason?: string };  // Sonstige Vorgaben
}

export interface ProjectState {
  schemaVersion: 1;
  templateId: 'T-01' | 'T-02' | 'T-03' | 'T-04' | 'T-05';
  facts: Fact[];
  procedures: Procedure[];
  documents: DocumentItem[];
  roles: Role[];
  recommendations: Recommendation[];   // sorted by rank ascending
  areas: Areas;
  questionsAsked: string[];            // de-dup against repeating
  lastTurnAt: string;
}
```

Document this file in code. Every read/write to `projects.state` goes through a typed helper.

### 4.3 Edge Function — `chat-turn`

Path: `supabase/functions/chat-turn/index.ts`. Deno.

**Responsibilities:**
1. Verify the user's JWT (extract user from `Authorization: Bearer ...` header).
2. Accept a request: `{ projectId: string, userMessage: string | null, userAnswer: any | null }`.
3. Load the project (RLS-checked) and recent messages (last 30).
4. Build the Anthropic API request:
   - Model: `claude-sonnet-4-5`.
   - System prompt: multi-block. Block 1 = the long persona / specialist / law / template content (cached via `cache_control: { type: "ephemeral" }`). Block 2 = the live project state (not cached).
   - Messages: full conversation history mapped from DB.
   - Tools: a single tool `respond` with the structured schema below. `tool_choice: { type: "tool", name: "respond" }`.
5. Call Anthropic. Time the request. Capture tokens.
6. Validate the tool call output against a Zod schema.
7. Persist the user message (if userMessage present), the assistant message, and any state mutations into `projects.state` and `project_events` in a single transaction.
8. Return: `{ assistantMessage, projectState, costInfo }`.

**Error handling inside Edge Function:**
- Anthropic 429 / 529 / 5xx → return `{ error: 'upstream_overloaded', retryAfterMs: 4000 }` to client.
- Anthropic refuses or returns malformed tool call → fall back: ask Anthropic again with a stricter system reminder; if still bad, return `{ error: 'model_response_invalid' }`.
- DB errors → log and return `{ error: 'persistence_failed' }`.
- Always return JSON with a stable error envelope.
- Set CORS headers correctly (we're calling from `planning-matrix.vercel.app` and `localhost:5173`).

**Secrets:**
- `ANTHROPIC_API_KEY` — set in Supabase dashboard → Project Settings → Edge Functions → Secrets.

### 4.4 The structured-output tool schema (Anthropic tool use)

Force the model to call this single tool every turn:

```json
{
  "name": "respond",
  "description": "Respond to the user as the active specialist on the planning team and update project state.",
  "input_schema": {
    "type": "object",
    "required": ["specialist", "message_de", "message_en", "input_type"],
    "properties": {
      "specialist": {
        "type": "string",
        "enum": ["moderator","planungsrecht","bauordnungsrecht","sonstige_vorgaben","verfahren","beteiligte","synthesizer"]
      },
      "message_de": { "type": "string", "description": "The message to the user, in formal German (Sie). 2–6 short sentences." },
      "message_en": { "type": "string", "description": "An English mirror of message_de." },
      "input_type": { "type": "string", "enum": ["text","yesno","single_select","multi_select","address","none"] },
      "input_options": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["value","label_de","label_en"],
          "properties": {
            "value": { "type": "string" },
            "label_de": { "type": "string" },
            "label_en": { "type": "string" }
          }
        }
      },
      "allow_idk": { "type": "boolean", "default": true },
      "thinking_label_de": { "type": "string", "description": "Tiny label shown briefly while the next turn is computed, e.g. 'Planungsrecht prüft den Bebauungsplan'." },
      "thinking_label_en": { "type": "string" },

      "extracted_facts": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["key","value","source","quality"],
          "properties": {
            "key": { "type": "string" },
            "value": {},
            "source": { "type": "string", "enum": ["LEGAL","CLIENT","DESIGNER","AUTHORITY"] },
            "quality": { "type": "string", "enum": ["CALCULATED","VERIFIED","ASSUMED","DECIDED"] },
            "evidence": { "type": "string" },
            "reason": { "type": "string" }
          }
        }
      },

      "recommendations_delta": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["op","id"],
          "properties": {
            "op": { "type": "string", "enum": ["upsert","remove"] },
            "id": { "type": "string" },
            "rank": { "type": "integer" },
            "title_de": { "type": "string" },
            "title_en": { "type": "string" },
            "detail_de": { "type": "string" },
            "detail_en": { "type": "string" }
          }
        }
      },

      "procedures_delta": {
        "type": "array",
        "items": { "type": "object" }
      },
      "documents_delta": {
        "type": "array",
        "items": { "type": "object" }
      },
      "roles_delta": {
        "type": "array",
        "items": { "type": "object" }
      },

      "areas_update": {
        "type": "object",
        "properties": {
          "A": { "type": "object", "properties": { "state": { "type": "string", "enum": ["ACTIVE","PENDING","VOID"] }, "reason": { "type": "string" } } },
          "B": { "type": "object", "properties": { "state": { "type": "string" }, "reason": { "type": "string" } } },
          "C": { "type": "object", "properties": { "state": { "type": "string" }, "reason": { "type": "string" } } }
        }
      },

      "completion_signal": {
        "type": "string",
        "enum": ["continue","needs_designer","ready_for_review","blocked"],
        "description": "Whether the conversation should continue, escalate to a Designer, present an interim review, or block on missing data."
      }
    }
  }
}
```

Mirror this in `src/types/respondTool.ts` and validate every model response against it with Zod before persisting.

### 4.5 The system prompt (DE)

Write this as `supabase/functions/chat-turn/systemPrompt.ts` and reuse via the cache. This is the most important file in Phase 3 — it manifests the roundtable. Spend real time on it. Draft below. **Refine based on research. Iterate. Test.**

```
Sie sind das Planungsteam von Planning Matrix — keine einzelne KI, sondern ein Roundtable
spezialisierter Fachpersonen, die einem Bauherrn beim Verständnis seines deutschen
Baugenehmigungsprozesses helfen. In jeder Antwort spricht eine der folgenden Fachpersonen,
abhängig davon, wessen Domäne in diesem Moment relevant ist.

DIE FACHPERSONEN

• MODERATOR — Hält das Gespräch zusammen, fasst zusammen, leitet Übergaben ein, begrüßt zu Beginn.
• PLANUNGSRECHT — Spezialist:in für BauGB §§30/34/35, BauNVO, B-Pläne, F-Pläne. Frage: „Darf
  hier überhaupt gebaut werden?"
• BAUORDNUNGSRECHT — Spezialist:in für BayBO. Gebäudeklasse, Sonderbau, Verfahren
  (Genehmigungsfreistellung / vereinfacht / regulär), Brandschutz, Stellplätze, GEG.
  Frage: „Welches Verfahren ist nötig?"
• SONSTIGE_VORGABEN — Spezialist:in für Baulasten, Denkmalschutz, kommunale Satzungen,
  nutzungsbedingte Sondergenehmigungen. Frage: „Was sonst noch zu beachten?"
• VERFAHREN — Synthesizer:in. Fügt die Bewertungen der drei Domänen zu einer einheitlichen
  Verfahrens- und Dokumentenempfehlung zusammen.
• BETEILIGTE — Rollenbedarfsanalytiker:in. Leitet aus den Verfahren die nötigen Fachplaner ab
  (Tragwerksplaner, Brandschutz, Energieberatung, Vermessung).
• SYNTHESIZER — Hebt projektübergreifende Muster hervor und produziert die Top-3-
  Handlungsempfehlungen für den Bauherrn.

GRUNDREGELN

1. Verwenden Sie ausschließlich die formelle deutsche Anrede (Sie, Ihnen, Ihre).
2. Eine Fachperson pro Antwort. Wählen Sie die Fachperson, deren Domäne jetzt am relevantesten
   ist. Wechsel sind erlaubt und gewünscht — aber niemals abrupt.
3. Antworten sind kurz, ruhig, präzise. 2–6 Sätze. Keine Ausrufezeichen. Keine Emojis.
   Keine PR-Sprache. Keine künstliche Begeisterung.
4. Wenn Sie sich auf rechtliche Grundlagen beziehen, zitieren Sie die Norm präzise
   (z. B. „BayBO Art. 57 Abs. 1") — aber kurz, integriert, nicht aufgeblasen.
5. Stellen Sie immer genau eine Frage am Ende, oder bieten Sie einen klaren nächsten Schritt an.
   Niemals zwei offene Fragen gleichzeitig.
6. Wenn der Bauherr „Weiß ich nicht" antwortet, schlagen Sie einen Umgang vor:
     a) Recherche („Ich kann den Bebauungsplan für diese Adresse prüfen — soll ich?")
     b) Annahme („Wir können vorerst von einer typischen Wohnnutzung ausgehen und das
        später verifizieren — die Annahme wird im Datensatz markiert.")
     c) Zurückstellen („Diese Frage parken wir; sie blockiert nichts Wesentliches.")
7. Sie schreiben dem Bauherrn nichts vor, was rechtlich verbindlich erst der/die Entwurfs-
   verfasser:in (Architekt:in) freigeben kann. Markieren Sie offen: „Diese Einschätzung
   ist vorläufig und wird beim Eintritt einer/eines bauvorlageberechtigten Architekt:in
   formell bestätigt."
8. Sprechen Sie nie davon, dass Sie eine KI sind. Sie sind das Planungsteam.

QUALIFIER-DISZIPLIN

Jeder Fakt, den Sie aus der Konversation extrahieren, erhält Source × Quality:
  Source: LEGAL (aus Gesetz abgeleitet) | CLIENT (vom Bauherrn) | DESIGNER (vom Architekten) | AUTHORITY (vom Amt)
  Quality: CALCULATED | VERIFIED | ASSUMED | DECIDED
Senken Sie die Qualität ehrlich: wenn der Bauherr eine Annahme äußert, ist das CLIENT/ASSUMED,
nicht CLIENT/DECIDED. Markieren Sie immer den Grund.

AREAS

Drei Bereiche werden parallel bewertet. Setzen Sie deren Status:
  A — Planungsrecht
  B — Bauordnungsrecht
  C — Sonstige Vorgaben
Status: ACTIVE (in Arbeit, ausreichend Daten) | PENDING (warten auf Eingabe) | VOID (nicht
ermittelbar — typischerweise wenn kein Grundstück bekannt ist).

EMPFEHLUNGEN

Halten Sie immer eine Liste der Top-3 nächsten Handlungsschritte aktuell. Diese erscheinen
in der rechten Spalte beim Bauherrn. Sie sind kurz, konkret, ausführbar — keine Phrasen.
Beispiel: „1. Bebauungsplan beim Bauamt Erlangen anfordern. 2. Tragwerksplaner für
Ein­reichplanung kontaktieren. 3. Stellplatznachweis nach Erlanger Stellplatzsatzung prüfen."

PROJEKTKONTEXT (wird zur Laufzeit eingespeist)

[hier folgt der aktuelle Projektzustand: Template, Fakten, Areas, vorhandene Empfehlungen]

ANTWORTFORMAT

Sie antworten ausschließlich, indem Sie das Werkzeug `respond` aufrufen. Schreiben Sie
keinen Freitext außerhalb des Werkzeugs.
```

This is a draft. Refine. Add concrete examples in the system prompt. Test against representative project states. The quality of this prompt determines the quality of the product.

### 4.6 The "first turn" priming

When a project is first created (after the wizard), the Edge Function is called with no user message. The system primes itself based on the wizard answers. The first assistant message is **the moderator welcoming the user, summarizing what they've shared, naming the team that will be at the table, and asking the first substantive follow-up.**

Example first turn for `intent='neubau_einfamilienhaus', has_plot=true, plot_address='Hauptstraße 12, 91054 Erlangen'`:

> ● MODERATOR
> Guten Tag. Sie planen ein Einfamilienhaus auf der Hauptstraße 12 in Erlangen. Wir sind
> ein kleines Team — Planungsrecht, Bauordnungsrecht, sonstige Vorgaben — und arbeiten
> uns gemeinsam mit Ihnen durch die Frage, welche Genehmigungen, Unterlagen und Fachplaner
> Ihr Vorhaben tatsächlich erfordert. Bevor wir mit der planungsrechtlichen Einordnung
> beginnen, eine Verständnisfrage: Soll auf dem Grundstück bereits eine bestehende Bebauung
> abgerissen werden, oder bauen Sie auf einem unbebauten Grundstück?

That's the tone. Calm, substantial, one question.

---

## 5. The wizard — `/projects/new`

This is the gateway. It must be beautiful and fast. The user clicks "New project" on the dashboard and lands here.

### 5.1 Layout

**Different from anything we've built before.** Not split-screen with photo (auth). Not editorial scroll (landing). Not chat (the next phase).

- **Full-bleed paper background.** No photo. Nothing. Just paper.
- **Centered, vertically: a single question.** Big Instrument Serif, max-width comfortable for reading.
- **Below: input options.** Chips, text input, or address field — depending on question.
- **Top-left:** small logo wordmark linking back to dashboard.
- **Top-right:** language switcher (DE/EN), and a small "Abbrechen" link that confirms before discarding.
- **Bottom:** progress hairline — two dots (1 / 2). Subtle. Filled = answered. The current dot pulses gently in clay.
- **No nav, no sidebar, no clutter.** This is a focused moment.

Behind the scenes: a very subtle blueprint grid (ink at 4% opacity) reveals on hover near the input, fades on blur. A breath of life, no more.

### 5.2 Question 1 — I-01

**Eyebrow:** "Planning Matrix · Initialisierung · 1 / 2"
**Headline:** "Was möchten Sie bauen?"
**Sub:** "Wählen Sie die Option, die Ihrem Vorhaben am nächsten kommt."
**Options (chips, single-select):**
- Neubau Einfamilienhaus
- Neubau Mehrfamilienhaus
- Sanierung
- Umnutzung
- Abbruch
- Sonstiges

Below the chips, a tiny "Ich bin mir nicht sicher" link. If clicked, opens a small inline help: a one-paragraph plain-language explanation of each option. Click an option → smooth transition to question 2 (300ms cross-fade + 8px y-shift).

### 5.3 Question 2 — I-02

**Eyebrow:** "Planning Matrix · Initialisierung · 2 / 2"
**Headline:** "Haben Sie bereits ein Grundstück?"
**Sub:** "Wenn ja, geben Sie die Adresse oder die Flurstücksbezeichnung an. Wenn nein, fahren wir mit Annahmen fort."

Two-state input:
1. **Default state:** Yes / No toggle. Defaults to no selection.
2. **If Yes:** address text input slides in below — Inter, hairline-bottom-border, placeholder "z. B. Hauptstraße 12, 91054 Erlangen". Validate non-empty, min 6 chars. Optional helper: "Wir nutzen die Adresse zur Recherche von Bebauungsplan und örtlichen Satzungen."
3. **If No:** small notice in clay-tinted text — "Hinweis: Ohne Grundstück können wir das Planungsrecht (Bereich A) und sonstige Vorgaben (Bereich C) noch nicht ermitteln. Wir arbeiten zunächst mit Standardannahmen und markieren betroffene Bereiche entsprechend."

A "Zurück" link sits below, returning to question 1 with the previous answer preserved.

A primary "Projekt anlegen" button sits below the answer, disabled until valid.

### 5.4 Submission flow

When "Projekt anlegen" is clicked:

1. Client-side: build the project payload `{ intent, has_plot, plot_address, bundesland: 'bayern', template_id }`. Compute `template_id` from the decision table (§5.5).
2. Generate a default `name` from the intent + plot or "Projekt vom <date>".
3. Insert into `projects` table via Supabase JS client.
4. On success: invoke Edge Function `chat-turn` with `{ projectId, userMessage: null }` to generate the first assistant turn.
5. On Edge Function success: navigate to `/projects/<id>` (the chat workspace).
6. Show a calm full-screen transition — a brief "Wir bereiten Ihren Tisch vor..." with a hairline horizontal sweep, max 4 seconds, then route.

### 5.5 Template decision table

```ts
function selectTemplate(intent: Intent): TemplateId {
  switch (intent) {
    case 'neubau_einfamilienhaus':  return 'T-01';
    case 'neubau_mehrfamilienhaus': return 'T-02';
    case 'sanierung':                return 'T-03';
    case 'umnutzung':                return 'T-04';
    case 'abbruch':                  return 'T-05';
    case 'sonstige':                 return 'T-01';  // fallback to most flexible
  }
}
```

For v1 only T-01 has full system-prompt content. T-02 to T-05 use T-01 with an annotation in the system prompt that the project is similar but with caveats.

### 5.6 Edge cases for the wizard

- ☐ User refreshes mid-wizard → answers preserved in `sessionStorage` keyed by user id; restored on return.
- ☐ User clicks "Abbrechen" → confirm dialog "Eingaben werden verworfen. Fortfahren?" → confirm clears sessionStorage and routes to dashboard.
- ☐ User picks "Yes plot" but address is invalid (too short) → inline error, button stays disabled.
- ☐ Network failure on project insert → toast error "Projekt konnte nicht angelegt werden. Bitte versuchen Sie es erneut.", button re-enabled.
- ☐ Edge Function fails on first turn → project is still created; route to chat workspace; chat workspace shows a "Verbindung zum Team verloren — erneut versuchen" affordance (handled in §6).
- ☐ Wizard works on 320px width with no horizontal scroll.
- ☐ Reduced-motion respects: no transitions, instant state changes.
- ☐ Keyboard-only: tab order works; Enter on question 1 selects highlighted chip; Enter on question 2 submits when valid.

---

## 6. The chat workspace — `/projects/:id`

This is where the product lives. **Get this right.** The user should sit down and feel a slight thrill: "Oh — this is different."

### 6.1 Layout (desktop, ≥lg)

Three zones, defined as `grid-template-columns: 280px 1fr 360px` with a max overall width of `1440px`.

**Left rail — "Verlauf" (240–280px wide):**
- Small project header at top: project name (Inter medium 14px, truncate), location subline if any (Inter 12px clay).
- A vertical hairline separator below the header.
- A list of **gates** — vertical, hairline-bordered, calm:
  - 00 Übersicht (active by default)
  - 10 Projekt
  - 20 Grundstück
  - 30 Beteiligte
  - 40 Baurechtliche Einordnung (with sub-items 41–45 indented)
  - 50 Planung
  - 60 Dokumente
- Each gate row: a tiny clay dot for ACTIVE state, a hollow ring for PENDING, a faded slash for VOID. Inter 13px text. 6px vertical padding. Hover: ink-darken 5%.
- Below the gates: a small label "Am Tisch" + small list of specialists currently relevant to the conversation (auto-detected from the recent turns). Each as a clay dot + name in Inter 12px tracking-wide. This is alive — it shifts as the conversation progresses.
- At the bottom: a "Projekt verlassen" link in Inter 12px clay, returning to dashboard.

**Center — "Gespräch" (flexible, max-w-2xl, padded ~80px top/bottom):**
- Conversation thread. Newest message at the bottom. Auto-scroll to bottom on new message; pause auto-scroll if user has scrolled up.
- Messages alternate user / assistant. **Visual treatment is asymmetric** to make the roundtable feel real:
  - **User messages:** right-aligned, paper-on-paper card with hairline border, ink text, Inter 15px. No avatar.
  - **Assistant messages:** left-aligned, no card (paper background), preceded by a small specialist tag — `● PLANUNGSRECHT` Inter 11px tracking-[0.16em] uppercase clay-colored, with the clay dot to the left. Below the tag, the message in Inter 15px ink with `leading-relaxed`. Important phrases or law citations rendered in `font-medium`.
- Between message pairs: a generous breath of vertical space (~32px).
- A subtle hairline-fade horizontal divider after every group of 6 turns (helps long conversations breathe).
- **Typewriter rendering** for new assistant messages: characters appear at variable rhythm (mean 18ms, jitter ±10ms, occasional 100ms pause at sentence ends). Skippable by clicking anywhere in the message area. Reduced-motion: render instantly.
- **Thinking indicator** between user submission and assistant message: the next specialist's tag appears immediately, followed by three hairline dots animating left-to-right in clay. Above the dots, in Inter 11px clay, the `thinking_label_de` from the previous turn (e.g. "Planungsrecht prüft den Bebauungsplan..."). If the response takes >6s, the label rotates through 3–4 plausible variations.
- **Input bar at the bottom**, sticky:
  - **Adapts to `input_type`:**
    - `text` → standard Inter input, hairline bottom border, placeholder from server, Enter to submit, Shift+Enter for newline. Multiline auto-grows up to 5 rows.
    - `yesno` → two pill buttons "Ja" / "Nein". Keyboard 1/2 selects.
    - `single_select` → row of chips, one click submits. Keyboard arrows + Enter.
    - `multi_select` → chips toggle, primary "Weiter" button submits. At least 1 selection required.
    - `address` → address input with optional autocomplete (defer real geocoding to Phase 3.5; for v1 just text validation).
    - `none` → input bar replaced by a primary "Weiter" CTA, used when the assistant is delivering a multi-message setup.
  - **A persistent "Weiß ich nicht" affordance** sits to the right of every input type when `allow_idk: true` — a small underlined link. Click → opens a popover with three options: "Recherche durchführen lassen" / "Als Annahme markieren" / "Zurückstellen". Each has a one-line explanation. Clicking any sends the corresponding message to the Edge Function.

**Right rail — "Was wir wissen" (340–360px wide):**
This is the live matrix view. **It must visibly populate during the conversation.** This is what makes the product feel alive.
- Top section: **"Top 3 Schritte"** — Inter 11px tracking eyebrow. Below: 3 numbered cards (or fewer initially), each with title in Instrument Serif 18px, detail in Inter 13px. New entries fade-in with 16px y-rise + opacity (300ms). Replaced entries cross-fade. Removed entries fade-out (200ms).
- Middle section: **"Bereiche"** — Inter eyebrow. Three rows, A / B / C. Each shows the current `AreaState` with a clay-or-ink dot and a Inter 12px label. Hover reveals the `reason` in a tooltip.
- Below: **"Eckdaten"** — Inter eyebrow. List of key facts (Fact[] filtered to ~5 most relevant: intent, plot, Gebäudeklasse, Verfahren). Each fact shows value + tiny qualifier badge (e.g. `LEGAL · CALCULATED` in 10px clay).
- Below: **"Verfahren"** + **"Dokumente"** + **"Fachplaner"** — collapsed by default, click to expand. Each is a hairline-bordered list, items appear as the assistant adds them.
- Bottom: a small "Vollständige Übersicht öffnen" link → opens a full-screen modal with every fact, procedure, document, role with all qualifiers (the architect's view, even though we're CLIENT for v1 — read-only for client).

### 6.2 Layout (mobile, <lg)

- Center column only, edge-to-edge. Top bar with project name + a small icon for the right rail (vaul drawer).
- Left rail accessed via a top-left hamburger → vaul drawer from the left.
- Right rail accessed via a top-right icon → vaul drawer from the right. The right rail also slides up partially when new recommendations arrive — a subtle peek (60px) for 4 seconds, then retracts. Tap to expand. Reduced-motion: notification badge instead.
- Input bar is sticky at the bottom with safe-area inset.

### 6.3 Empty state (just-created project, before first assistant message arrives)

- Center: a calm placeholder. Eyebrow "Planning Matrix". Headline (serif): "Das Team versammelt sich.". Body (Inter): "Einen Moment, bitte." A hairline horizontal sweep animation runs underneath, looping every 2.4s.
- If the first turn fails: replace with "Wir konnten das Team nicht erreichen." + a primary button "Erneut versuchen".

### 6.4 Returning to a project (loaded from DB)

- On route entry, fetch project + messages via TanStack Query.
- Render messages with full content, no typewriter (instant — they're history).
- Render right rail from `state`.
- Auto-scroll to bottom.
- The input bar matches the *last* assistant message's `input_type`. So a returning user sees exactly the affordance they had.

### 6.5 The "Verifiziert" badge — the legal shield

For v1 (CLIENT-only, no DESIGNER), we never show "Verifiziert" anywhere as a badge — because nothing is. Instead, every recommendation card and the Top-3 carries a subtle footer line in Inter 11px clay:

> *Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.*

This line is part of the brand. It is the legal frame, communicated calmly. **Do not omit it. Do not minimize it. It is a feature, not a disclaimer.**

### 6.6 Cost awareness (admin-only, for now)

In the right rail bottom, in 9px clay, render `≈ X token used in this conversation`. Hover: tooltip with input/output/cache breakdown. This helps Rutik monitor cost. Hide for non-Rutik users in v1 by gating on a hardcoded email allowlist (TODO comment for Phase 4 to make this an admin role).

---

## 7. Question generation and the dynamic flow

### 7.1 Turn protocol

1. **User submits an answer.** The frontend builds a user message:
   - `text` → free-form string.
   - `yesno` → "Ja" or "Nein".
   - `single_select` → the selected option's `label_de`.
   - `multi_select` → comma-joined labels.
   - `address` → free-form string.
   - `idk_research` → "Weiß ich nicht — bitte recherchieren."
   - `idk_assume` → "Weiß ich nicht — bitte als Annahme markieren."
   - `idk_skip` → "Weiß ich nicht — bitte zurückstellen."
2. The frontend optimistically appends the user message to the thread.
3. The frontend calls Edge Function `chat-turn` with `{ projectId, userMessage, userAnswer }`.
4. The frontend shows the thinking indicator (specialist tag + dots + label).
5. The Edge Function:
   - Loads project + last 30 messages.
   - Calls Anthropic with system prompt + history + tool-forced response.
   - Validates. Persists. Returns.
6. The frontend:
   - Appends the assistant message with typewriter animation.
   - Updates the right rail (top-3, areas, eckdaten, etc.) with reactive transitions.
   - Sets the input bar to the new `input_type` + options.

### 7.2 The "Weiß ich nicht" branches

The model is instructed (in the system prompt) to handle the three IDK branches as follows:

- **Recherche:** the model formulates a research plan ("Ich werde den Bebauungsplan für 91054 Erlangen Hauptstraße prüfen — das kann einen Moment dauern."), and either (a) actually researches via simulated lookup using its training data + the address (v1 does not have real B-Plan API access — be honest about this), or (b) produces a plausible default and marks the resulting fact as `LEGAL/ASSUMED` with an explicit rationale. **Do not pretend the model has a live B-Plan database.** In the system prompt, instruct the model: "Wenn Sie einen Wert nicht real prüfen können, antworten Sie ehrlich: 'Eine Live-Prüfung ist hier nicht möglich. Wir gehen vorerst von [X] aus und markieren dies als Annahme.'" This is critical for trust.
- **Annahme:** the model picks the most reasonable default for the question, sets the resulting fact as `CLIENT/ASSUMED`, and continues.
- **Zurückstellen:** the model marks the relevant Area or Fact as `PENDING`, skips to the next priority gap, and notes in conversation that it's parked.

### 7.3 Conversation completion

The model has a `completion_signal` field. Values:

- `continue` → normal turn.
- `needs_designer` → all CLIENT-side info is gathered; proceeding requires architect involvement. The frontend shows a calm interstitial in the thread: "An diesem Punkt benötigen wir eine/n bauvorlageberechtigte/n Architekt/in. Sie können das Projekt jetzt teilen oder vorerst pausieren." (For v1 the share function is a stub — it's a hint at Phase 4.)
- `ready_for_review` → the conversation has reached a stable interim point. The frontend renders a soft "Zwischenstand" card in the thread summarizing what's been established.
- `blocked` → an Area is VOID and progress requires unblocking. The frontend surfaces the blockage clearly with an action.

### 7.4 De-duplication of questions

The system prompt instructs the model to never re-ask a question already in `questionsAsked`. The Edge Function appends the asked question's normalized form to the array. If the model violates this, the validator returns `model_response_invalid` and the call retries once.

---

## 8. Visual direction — distinct but coherent

This phase introduces **the third room** in the building. The user has walked through:
1. **Landing (Phase 1):** editorial, atmospheric, photographic.
2. **Auth (Phase 2):** split-screen, atmospheric still life, focused.
3. **Wizard + Chat (Phase 3):** quiet workshop, blueprint paper, minimal chrome.

The vocabulary is the same — Instrument Serif + Inter, paper / ink / clay, hairlines, calm motion — but the **mood** shifts from "marketing" to "working." Less photography. More structure. More restraint.

### 8.1 Specific visual moves new in Phase 3

- **Subtle blueprint hairline grid** (4% opacity ink, 24px cell) on the chat workspace background. Reveals on hover near interactive elements; fades elsewhere. Use a CSS `radial-gradient` mask centered on the cursor to create the effect cheaply.
- **Specialist dots in clay** — `hsl(25 30% 38%)` filled circle, 6px diameter, positioned 8px before each specialist tag. Animate in with scale 0 → 1 (cubic-bezier 0.16 1 0.3 1, 240ms).
- **Hairline progress meter** instead of spinners — 1px tall, full width of the relevant container, sweeps left-to-right with a clay gradient `transparent → clay → transparent` over 1.6s, infinite.
- **Right-rail reactive transitions** — when a recommendation's rank changes, animate it sliding to the new position with a 320ms ease.
- **Soft "match cut" between turns** — the previous specialist's tag fades 50% before the new specialist's tag appears, so the eye carries through.

### 8.2 What we explicitly do not do

- No bubble chat with avatars and timestamps. We are not iMessage.
- No green "online" dots, no checkmarks, no reactions.
- No bouncy animations, no spring physics, no confetti.
- No skeleton loaders that look like LinkedIn placeholders.
- No "AI is generating..." with a sparkle icon. We are a roundtable, not a chatbot.
- No gradient backgrounds beyond what already exists in the brand.
- No emoji.

---

## 9. State management

### 9.1 Zustand slices

- `useChatStore({ activeProjectId, messages, isAssistantThinking, currentSpecialist, currentThinkingLabel, sendMessage, retry })` — per-project session state.
- `useProjectStore({ project, state, setState, refetch })` — project + state hydration.
- `useAuthStore` — already exists from Phase 2.

### 9.2 TanStack Query

- `useProject(projectId)` → fetches `projects` row.
- `useMessages(projectId)` → fetches `messages` rows ordered by `created_at`.
- `useChatTurn()` mutation → calls Edge Function, optimistically appends user message, on success appends assistant message and invalidates `useProject`.

### 9.3 Optimistic updates

User messages appear instantly. If the Edge Function fails, the message is marked with a small "Erneut senden" affordance (Inter 11px clay underline) below the message. Clicking re-tries. After 3 failed retries, the message stays but the chat enters a soft offline state with a top-of-thread banner.

### 9.4 Hydration on page load

- Mount: fetch project + messages.
- If `messages.length === 0`: assume first-turn priming has not occurred yet (rare; could happen if the wizard's Edge Function call failed). Trigger first-turn priming now.
- If `messages.length > 0`: render history, set input bar to the last assistant message's input config.

---

## 10. Routing additions

Update `src/app/router.tsx`:

| Path | Page | Auth |
|---|---|---|
| `/projects/new` | WizardPage | Protected |
| `/projects/:id` | ChatWorkspacePage | Protected — also verify `project.owner_id === auth.user.id` |
| `/projects/:id/overview` | OverviewModalPage (full state) | Protected — same ownership check |

`ProtectedRoute` already exists. Add a `ProjectGuard` HOC/hook that verifies ownership and 404s otherwise. Render a calm "Projekt nicht gefunden" page on failure.

---

## 11. The Edge Function's local development story

- `supabase functions serve chat-turn --env-file ./supabase/.env.local`
- Set `VITE_USE_LOCAL_FUNCTIONS=true` in `.env.local` so the client points to `http://localhost:54321/functions/v1/chat-turn`.
- Document this in README.

---

## 12. Edge cases — the long checklist

Mark every one DONE before declaring complete.

### Wizard
1. ☐ Refresh mid-wizard preserves answers (sessionStorage).
2. ☐ Cancel triggers confirm dialog.
3. ☐ Yes-plot with empty/short address → button stays disabled with inline error.
4. ☐ Network failure on insert → toast + retry.
5. ☐ Network failure on first-turn priming → project still created, route to chat, chat shows retry affordance.
6. ☐ 320px width works with no horizontal scroll.
7. ☐ Reduced-motion: no transitions.
8. ☐ Keyboard-only: full flow operable.
9. ☐ Screen reader: questions are `<h1>`; options are `<button>` with discernible text; progress is `<progressbar>` with aria.

### Chat workspace
10. ☐ Concurrent turns: while assistant is thinking, the input bar is disabled. The user cannot send another message.
11. ☐ User pastes a 10000-char message → trimmed to 4000 chars on submit with an inline "Nachricht wurde gekürzt" notice.
12. ☐ Edge Function returns 429 → input bar shows "Zu viele Anfragen, einen Moment..." and auto-retries after the suggested delay (with a visible countdown).
13. ☐ Edge Function returns 5xx → manual retry button appears below the failed user message.
14. ☐ Network drops mid-thinking → after 30s timeout, surface "Verbindung verloren" banner with retry. Never silently hang.
15. ☐ User clicks "Erneut senden" → re-submits without duplicating the user message in DB (idempotency: include a `client_request_id` UUID per attempt; Edge Function deduplicates).
16. ☐ Anthropic returns malformed tool call → Edge Function retries once with a stricter system reminder; if still bad, fail visibly.
17. ☐ Auto-scroll pause when user scrolls up; new-messages indicator appears; click to scroll to bottom.
18. ☐ Long messages render with proper word-wrap; no overflow.
19. ☐ Code spans / law citations (e.g. "BayBO Art. 57") rendered in Inter `font-medium` with no special background — restrained.
20. ☐ Right-rail empty state (no recommendations yet): "Empfehlungen erscheinen hier, sobald genug Informationen vorliegen." in clay 12px.
21. ☐ Right-rail recommendation rank change: animated reordering, never jumps.
22. ☐ Area state transitioning to VOID: shown clearly with the reason on hover.
23. ☐ Returning to a project after a day: messages render instantly, no typewriter, no thinking indicator.
24. ☐ Two browser tabs on same project: last write wins; no real-time sync in v1 but no corruption either.
25. ☐ Sign out from chat: confirm dialog if there's an unsubmitted message; otherwise sign out immediately.
26. ☐ Browser back button: returns to dashboard cleanly.
27. ☐ Keyboard navigation: Tab cycles input → IDK link → submit; Esc closes IDK popover.
28. ☐ Focus trap inside the IDK popover; restore focus on close.
29. ☐ All buttons have accessible names; all form fields have labels (visible or sr-only).
30. ☐ Reduced-motion: typewriter off, transitions off, thinking dots become static "denkt nach...".
31. ☐ DE / EN switch mid-conversation: assistant messages render in the chosen language using `content_de` or `content_en`. New user messages stored in their original language.
32. ☐ DE / EN switch updates the input bar labels and IDK popover.
33. ☐ Long-running conversation (>50 messages): performance stays good — virtualize message list if needed (use `@tanstack/react-virtual` only if you can demonstrate jank without it).
34. ☐ Offline (browser detects no network): banner "Offline — Eingaben werden bei erneuter Verbindung gesendet." Pending messages queue locally. On reconnection, flush queue.
35. ☐ Plot address wasn't given (has_plot=false): Areas A and C are VOID from turn 1; the moderator opens with a transparent acknowledgment of this.
36. ☐ The `completion_signal === 'needs_designer'` interstitial renders cleanly.
37. ☐ Cost token counter on right-rail bottom updates per turn (admin-only).
38. ☐ Edge Function logs every turn (project_id, latency_ms, tokens) for monitoring.
39. ☐ RLS verified: a different authenticated user cannot read this project. Test with a second account.
40. ☐ Page title updates per project: "<Project name> · Planning Matrix".
41. ☐ The "Vorläufig — bestätigt durch ..." footer line is present on every recommendation card and on the Top-3.
42. ☐ The wizard's transition into the chat workspace feels seamless — no flash of empty state.
43. ☐ A user hitting `/projects/:id` for a project that doesn't exist (or isn't theirs) sees a calm 404.

---

## 13. i18n keys to add

Add a `chat` namespace and a `wizard` namespace. Provide DE + EN for every key. Match the formal "Sie" register. Examples:

```
wizard.eyebrow
wizard.q1.headline
wizard.q1.sub
wizard.q1.options.neubau_einfamilienhaus
wizard.q1.options.neubau_mehrfamilienhaus
wizard.q1.options.sanierung
wizard.q1.options.umnutzung
wizard.q1.options.abbruch
wizard.q1.options.sonstige
wizard.q1.unsureLink
wizard.q1.unsureExplanation
wizard.q2.headline
wizard.q2.sub
wizard.q2.yes
wizard.q2.no
wizard.q2.addressLabel
wizard.q2.addressPlaceholder
wizard.q2.addressHelper
wizard.q2.noPlotNotice
wizard.back
wizard.cancel
wizard.cancelConfirm
wizard.submit
wizard.submitLoading
wizard.transition.message

chat.gates.00
chat.gates.10
chat.gates.20
chat.gates.30
chat.gates.40
chat.gates.50
chat.gates.60
chat.atTheTable
chat.specialists.moderator
chat.specialists.planungsrecht
chat.specialists.bauordnungsrecht
chat.specialists.sonstige_vorgaben
chat.specialists.verfahren
chat.specialists.beteiligte
chat.specialists.synthesizer
chat.empty.headline
chat.empty.body
chat.empty.error
chat.empty.retry
chat.thinking.fallbackLabel
chat.input.text.placeholder
chat.input.idk.label
chat.input.idk.research
chat.input.idk.researchExplain
chat.input.idk.assume
chat.input.idk.assumeExplain
chat.input.idk.skip
chat.input.idk.skipExplain
chat.input.send
chat.input.continue
chat.input.cooldownPrefix
chat.banner.offline
chat.banner.networkLost
chat.banner.retry
chat.rail.top3
chat.rail.areas
chat.rail.facts
chat.rail.procedures
chat.rail.documents
chat.rail.roles
chat.rail.openOverview
chat.rail.empty
chat.areas.A
chat.areas.B
chat.areas.C
chat.areas.state.active
chat.areas.state.pending
chat.areas.state.void
chat.qualifier.legal
chat.qualifier.client
chat.qualifier.designer
chat.qualifier.authority
chat.qualifier.calculated
chat.qualifier.verified
chat.qualifier.assumed
chat.qualifier.decided
chat.preliminaryFooter
chat.completion.needsDesigner
chat.completion.readyForReview
chat.completion.blocked
chat.error.malformedResponse
chat.error.upstreamOverloaded
chat.error.persistenceFailed
chat.error.generic
chat.notFound.headline
chat.notFound.body
chat.notFound.cta
```

Roughly 80 keys. Translate each carefully. The German is the canonical voice — translate from DE → EN, not the other way around.

---

## 14. File / folder plan

```
src/
├── features/
│   ├── wizard/
│   │   ├── pages/
│   │   │   └── WizardPage.tsx
│   │   ├── components/
│   │   │   ├── WizardShell.tsx
│   │   │   ├── ProgressDots.tsx
│   │   │   ├── QuestionIntent.tsx
│   │   │   ├── QuestionPlot.tsx
│   │   │   └── TransitionScreen.tsx
│   │   ├── hooks/
│   │   │   ├── useWizardState.ts
│   │   │   └── useCreateProject.ts
│   │   ├── lib/
│   │   │   └── selectTemplate.ts
│   │   └── index.ts
│   └── chat/
│       ├── pages/
│       │   ├── ChatWorkspacePage.tsx
│       │   └── OverviewModalPage.tsx
│       ├── components/
│       │   ├── ChatWorkspaceLayout.tsx
│       │   ├── LeftRail/
│       │   │   ├── LeftRail.tsx
│       │   │   ├── ProjectHeader.tsx
│       │   │   ├── GateList.tsx
│       │   │   └── SpecialistsAtTheTable.tsx
│       │   ├── Thread/
│       │   │   ├── Thread.tsx
│       │   │   ├── MessageUser.tsx
│       │   │   ├── MessageAssistant.tsx
│       │   │   ├── SpecialistTag.tsx
│       │   │   ├── ThinkingIndicator.tsx
│       │   │   ├── Typewriter.tsx
│       │   │   ├── DividerHairline.tsx
│       │   │   └── CompletionInterstitial.tsx
│       │   ├── Input/
│       │   │   ├── InputBar.tsx
│       │   │   ├── InputText.tsx
│       │   │   ├── InputYesNo.tsx
│       │   │   ├── InputSelect.tsx
│       │   │   ├── InputMultiSelect.tsx
│       │   │   ├── InputAddress.tsx
│       │   │   └── IdkPopover.tsx
│       │   ├── RightRail/
│       │   │   ├── RightRail.tsx
│       │   │   ├── Top3.tsx
│       │   │   ├── AreasPanel.tsx
│       │   │   ├── EckdatenPanel.tsx
│       │   │   ├── ProceduresPanel.tsx
│       │   │   ├── DocumentsPanel.tsx
│       │   │   ├── RolesPanel.tsx
│       │   │   └── CostTicker.tsx
│       │   ├── BlueprintBackground.tsx
│       │   ├── Banners/
│       │   │   ├── OfflineBanner.tsx
│       │   │   └── RetryBanner.tsx
│       │   └── ProjectNotFound.tsx
│       ├── hooks/
│       │   ├── useProject.ts
│       │   ├── useMessages.ts
│       │   ├── useChatTurn.ts
│       │   ├── useAutoScroll.ts
│       │   └── useTypewriter.ts
│       └── index.ts
├── lib/
│   ├── chatApi.ts                  (calls Edge Function with auth)
│   ├── projectStateHelpers.ts      (typed read/write of state JSONB)
│   └── i18nFormatters.ts
├── stores/
│   ├── chatStore.ts
│   └── projectStore.ts
├── types/
│   ├── projectState.ts
│   └── respondTool.ts
└── components/shared/
    └── ProjectGuard.tsx

supabase/
├── migrations/
│   └── 0002_planning_matrix_core.sql
└── functions/
    └── chat-turn/
        ├── index.ts
        ├── systemPrompt.ts
        ├── toolSchema.ts
        ├── persistence.ts
        └── deno.json
```

---

## 15. Commit sequence (small, reviewable, conventional)

1. `feat(db): add projects, messages, project_events tables with RLS`
2. `feat(types): add ProjectState and respond tool schemas`
3. `feat(edge): scaffold chat-turn function with JWT verification and CORS`
4. `feat(edge): add Anthropic system prompt and tool schema`
5. `feat(edge): wire Anthropic call with cache and tool-forced response`
6. `feat(edge): persist messages and project_state mutations`
7. `feat(edge): error handling, retries, idempotency keys`
8. `feat(wizard): scaffold /projects/new with shell and progress dots`
9. `feat(wizard): question 1 (intent) with options + unsure helper`
10. `feat(wizard): question 2 (plot) with conditional address`
11. `feat(wizard): submission flow → project insert → first-turn priming → route`
12. `feat(wizard): edge cases (refresh, cancel, network failures)`
13. `feat(chat): three-zone workspace shell with blueprint background`
14. `feat(chat): left rail with gates and specialists at the table`
15. `feat(chat): thread with user and assistant message components`
16. `feat(chat): typewriter and thinking indicator`
17. `feat(chat): input bar with adaptive controls (text/yesno/select/multi/address)`
18. `feat(chat): IDK popover with research/assume/skip branches`
19. `feat(chat): right rail Top-3 with reactive transitions`
20. `feat(chat): right rail areas, eckdaten, procedures, documents, roles panels`
21. `feat(chat): completion interstitials (needs_designer, ready_for_review, blocked)`
22. `feat(chat): full overview modal at /projects/:id/overview`
23. `feat(chat): banners (offline, retry, network lost)`
24. `feat(chat): cost ticker (admin allowlist)`
25. `feat(chat): mobile drawers via vaul`
26. `feat(i18n): add wizard and chat namespaces (DE + EN)`
27. `feat(chat): page titles, OG tags, ProjectGuard`
28. `feat(chat): typewriter respects reduced-motion`
29. `chore(docs): update README with edge function dev workflow and Supabase secrets`
30. `chore: smoke tests and manual test plan results in /docs/phase3-test-plan.md`

Push small, commit often. Vercel auto-deploys after every push to `main`.

---

## 16. Manual test plan (run on the live preview before declaring done)

Execute each step. Mark pass/fail. Include the result in your final report.

1. From `/dashboard`, click "Neues Projekt" → wizard renders.
2. Q1: pick "Neubau Einfamilienhaus" → Q2 appears, no flicker.
3. Q2: pick "Ja" → address input slides in.
4. Enter "Hauptstraße 12, 91054 Erlangen" → submit enabled.
5. Click submit → transition screen → land on `/projects/<id>` within 5s.
6. Empty state shows briefly, then first assistant message arrives with typewriter.
7. Tag reads `● MODERATOR`, message is in formal German, ends with one question.
8. Right rail shows project intent + plot under "Eckdaten"; A/B/C areas show ACTIVE/ACTIVE/ACTIVE.
9. Type a free-text answer, hit Enter → user message appears right-aligned, thinking indicator starts, next assistant message arrives within 8s with new specialist tag.
10. Click "Weiß ich nicht" → popover appears with three options.
11. Click "Recherche durchführen lassen" → assistant responds honestly about what it can/can't research live.
12. Switch language to EN at top → all UI strings switch; assistant message re-renders from `content_en`.
13. Refresh the page → conversation persists, instant render, no typewriter on history.
14. Open the same URL in a private window with a different account → 404.
15. Sign out from chat → confirm prompt → land on `/`.
16. Sign back in → dashboard shows the project in the project list (or as a single placeholder if list isn't built yet).
17. Open DevTools Network → throttle to "Slow 3G" → next turn surfaces a thinking indicator that lasts longer; no UI freeze.
18. DevTools Network → set offline → submit a message → "Offline" banner appears; reconnect → message flushes.
19. DevTools Network → block the Edge Function URL → submit → "Verbindung verloren" with retry button.
20. Repeat (19) and click retry 3x → after the 3rd, soft offline banner persists at top.
21. Reduced-motion (Mac System Preferences → Reduce Motion ON) → typewriter is off, transitions absent, no jank.
22. iPhone-sized viewport (375×812) → single-column, drawers work, input bar respects safe-area inset.
23. Keyboard-only navigation through wizard, then chat → tab order makes sense, Enter submits, Esc closes popovers.
24. After 8 turns, verify Top-3 has at least 3 entries and they are concrete and project-specific (not generic).
25. After 12 turns, trigger `completion_signal='ready_for_review'` deliberately by reaching the natural pause → interstitial renders.
26. Visit `/projects/:id/overview` → modal opens with all facts/procedures/documents/roles, qualifier badges visible.
27. Visit `/projects/:id` for a UUID that doesn't exist → calm 404.
28. Verify the *Vorläufig — bestätigt durch ...* footer is on every recommendation card.
29. Verify the right rail animates rank changes smoothly when the model promotes/demotes a recommendation.
30. Verify cost ticker increments per turn (logged in as Rutik).

---

## 17. Reporting protocol when done

When you push the final commit, write a single message to Rutik with:

1. **Live URL** of the working chat workspace.
2. **A one-paragraph summary** of what was built.
3. **A line-by-line table of all 43 edge cases (§12) and 30 manual test steps (§16),** marked `DONE` or `SKIPPED — reason`.
4. **Any deviation from this brief** and the reason. (You have creative authority within the brand. State your reasons clearly; we want the *best* outcome, not the literal one.)
5. **A list of open issues** you couldn't resolve and what's blocking each.
6. **A short list of "things you'd flag if you were reviewing this for someone else."** Be brutally honest.
7. **The total token cost** of running the manual test plan, in tokens and rough USD.
8. **The first three real conversation transcripts** (redacted as needed) so Rutik can read them as artifacts.

If anything in this brief was ambiguous or contradictory, **stop and ask before guessing.** Better to spend a message on confirmation than ship a misshapen product.

---

## 18. Things that are explicitly out of scope for Phase 3

- Real B-Plan / F-Plan data integration (we're honest with the user about this).
- Real geocoding / address autocomplete (text validation only).
- DESIGNER role surface, sign-off, formal release flow.
- ENGINEER and AUTHORITY roles.
- Multi-tenant project sharing.
- Real-time collaboration / multiple browsers same project.
- Other Bundesländer beyond Bayern.
- Templates T-02 through T-05 in fully fleshed form (they exist as routing fallback to T-01 + annotation).
- Document upload, file storage, BIM integration.
- Audit-grade tamper-evident logs (basic event log only).
- The Designer's full Cockpit / Gate 99 view.
- Stripe / billing / pricing surfaces.

These are noted in `/docs/phase3-out-of-scope.md` for the next phase.

---

## 19. The standard you are building to

**Ship a chat workspace where, on first sit-down, a serious German Bauherr feels two things in sequence:**

1. *"Oh — this is calmer than I expected."*
2. *"Wait. The team actually knows what they're talking about."*

If the user feels both within the first 90 seconds of conversation, you have built Phase 3 correctly. If they feel either as "another AI chatbot," start over.

The bar is not "shipped and works." The bar is **the best conversational permit-process tool that exists in Germany today.** That bar is achievable. Hold it.

---

## 20. If you have any doubt

Re-read sections 4 (architecture), 5 (wizard), 6 (chat workspace), and 7 (turn protocol) before writing code. Re-read the system prompt in 4.5 every time you change it. Refine the system prompt as you test — the system prompt is the most important asset in this phase.

When in doubt: **calmer, quieter, more restrained, more specific.** The model can get loud on its own. Your job is to keep it quiet.

Plan first. Confirm. Then execute. Do not stop. Nail it.

— End of Phase 3 brief.
