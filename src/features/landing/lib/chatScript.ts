/**
 * Roundtable script for the ChatPreview signature moment.
 *
 * Conversation arc (per build brief §7.2):
 *   Moderator greets → asks plot question → Planungsrecht analyzes →
 *   updates Area A to ACTIVE → Bauordnung analyzes → updates Area B →
 *   adds first rec → Sonstige adds nuance → updates Area C →
 *   adds 2nd + 3rd recs → Moderator wraps → pause 3s → restart.
 *
 * Sie register, technical, restrained. No exclamation marks. No softening.
 *
 * Phase 5 — pivoted from Erlangen to München (Altstadt-Lehel, 80331).
 * Anchors match the system prompt's München content: LBK München with
 * Sub-Bauamt routing (Mitte for Stadtbezirk 1), Stellplatzsatzung
 * StPlS 926 (1 Stp/WE for Wohnen, not the historical 2), Erhaltungs-
 * satzungen acknowledged.
 */

export type Specialist =
  | 'moderator'
  | 'planungsrecht'
  | 'bauordnungsrecht'
  | 'sonstige'
  | 'verfahren'

export type Step =
  | { kind: 'msg'; specialist: Specialist; role: 'assistant' | 'user'; text: string; delayMs: number }
  | { kind: 'typing'; specialist: Specialist; durationMs: number }
  | { kind: 'area'; area: 'A' | 'B' | 'C'; state: 'ACTIVE' | 'PENDING' | 'VOID' }
  | { kind: 'rec'; id: string; title: string; detail: string }
  | { kind: 'pause'; ms: number }
  | { kind: 'restart' }

export function getChatScript(lang: 'de' | 'en'): Step[] {
  return lang === 'de' ? scriptDe : scriptEn
}

const scriptDe: Step[] = [
  { kind: 'pause', ms: 600 },
  {
    kind: 'msg',
    specialist: 'moderator',
    role: 'assistant',
    delayMs: 0,
    text:
      'Guten Tag. Sie planen ein Einfamilienhaus auf der Zweibrückenstraße 12 in München. Wir gehen die rechtliche Einordnung gemeinsam durch.',
  },
  { kind: 'pause', ms: 1400 },
  { kind: 'typing', specialist: 'planungsrecht', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'planungsrecht',
    role: 'assistant',
    delayMs: 0,
    text:
      'Das Grundstück liegt im Innenbereich nach § 34 BauGB. Die geplante Wohnnutzung fügt sich in die nähere Umgebung ein.',
  },
  { kind: 'area', area: 'A', state: 'ACTIVE' },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'bauordnungsrecht', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'bauordnungsrecht',
    role: 'assistant',
    delayMs: 0,
    text:
      'Mit GK 3 und unter 7 m Höhe greift das vereinfachte Verfahren nach BayBO Art. 58. Sonderbau-Tatbestände liegen nicht vor.',
  },
  { kind: 'area', area: 'B', state: 'ACTIVE' },
  {
    kind: 'rec',
    id: 'r1',
    title: 'Vorabstimmung mit der LBK München',
    detail: 'Termin mit der Begutachtung Bezirk Mitte (Stadtbezirk 1).',
  },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'sonstige', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'sonstige',
    role: 'assistant',
    delayMs: 0,
    text:
      'Die Münchner Stellplatzsatzung StPlS 926 verlangt einen Stellplatz pro Wohneinheit. Lage in Altstadt-Lehel — Erhaltungssatzungen sind zu prüfen.',
  },
  { kind: 'area', area: 'C', state: 'ACTIVE' },
  {
    kind: 'rec',
    id: 'r2',
    title: 'Stellplatznachweis',
    detail: 'Ein KFZ-Stellplatz nach Münchner StPlS 926 (Anlage 1 Nr. 1.1).',
  },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'verfahren', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'verfahren',
    role: 'assistant',
    delayMs: 0,
    text:
      'Empfehlung: vereinfachtes Verfahren, Bauantrag mit neun Pflichtdokumenten direkt bei der LBK München.',
  },
  {
    kind: 'rec',
    id: 'r3',
    title: 'Bauantrag · vereinfachtes Verfahren',
    detail: '9 Pflichtdokumente, Architektenfreigabe erforderlich.',
  },
  { kind: 'pause', ms: 1600 },
  {
    kind: 'msg',
    specialist: 'moderator',
    role: 'assistant',
    delayMs: 0,
    text:
      'Damit haben wir einen klaren Pfad. Ich schlage drei nächste Schritte vor — rechts in der Übersicht.',
  },
  { kind: 'pause', ms: 3000 },
  { kind: 'restart' },
]

const scriptEn: Step[] = [
  { kind: 'pause', ms: 600 },
  {
    kind: 'msg',
    specialist: 'moderator',
    role: 'assistant',
    delayMs: 0,
    text:
      'Good day. You are planning a single-family house at Zweibrückenstraße 12 in Munich. We will walk through the legal classification together.',
  },
  { kind: 'pause', ms: 1400 },
  { kind: 'typing', specialist: 'planungsrecht', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'planungsrecht',
    role: 'assistant',
    delayMs: 0,
    text:
      'The plot is within the consolidated area per § 34 BauGB. The planned residential use fits the immediate surroundings.',
  },
  { kind: 'area', area: 'A', state: 'ACTIVE' },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'bauordnungsrecht', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'bauordnungsrecht',
    role: 'assistant',
    delayMs: 0,
    text:
      'With building class 3 and below 7 m height, the simplified procedure under BayBO Art. 58 applies. No special-use cases are triggered.',
  },
  { kind: 'area', area: 'B', state: 'ACTIVE' },
  {
    kind: 'rec',
    id: 'r1',
    title: 'Pre-meeting with LBK München',
    detail: 'Schedule with the Begutachtung Bezirk Mitte (Stadtbezirk 1).',
  },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'sonstige', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'sonstige',
    role: 'assistant',
    delayMs: 0,
    text:
      'The Munich parking ordinance StPlS 926 requires one parking space per dwelling. Site in Altstadt-Lehel — preservation ordinances are to be reviewed.',
  },
  { kind: 'area', area: 'C', state: 'ACTIVE' },
  {
    kind: 'rec',
    id: 'r2',
    title: 'Parking-space documentation',
    detail: 'One car space per Munich StPlS 926 (Annex 1 No. 1.1).',
  },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'verfahren', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'verfahren',
    role: 'assistant',
    delayMs: 0,
    text: 'Recommendation: simplified procedure, building application with nine mandatory documents filed directly with the LBK München.',
  },
  {
    kind: 'rec',
    id: 'r3',
    title: 'Building application · simplified procedure',
    detail: '9 mandatory documents, certified-architect sign-off required.',
  },
  { kind: 'pause', ms: 1600 },
  {
    kind: 'msg',
    specialist: 'moderator',
    role: 'assistant',
    delayMs: 0,
    text:
      'With that we have a clear path. I propose three next steps — on the right in the overview.',
  },
  { kind: 'pause', ms: 3000 },
  { kind: 'restart' },
]
