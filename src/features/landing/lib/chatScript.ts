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
      'Guten Tag. Sie planen ein Einfamilienhaus auf der Hauptstraße 12 in Erlangen. Wir gehen die rechtliche Einordnung gemeinsam durch.',
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
    title: 'Vorabstimmung Bauamt Erlangen',
    detail: 'Termin zur Verfahrensklärung mit Sachbearbeitung.',
  },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'sonstige', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'sonstige',
    role: 'assistant',
    delayMs: 0,
    text:
      'Die Erlanger Stellplatzsatzung verlangt zwei Stellplätze. Baulasten sind im Grundbuch nicht eingetragen.',
  },
  { kind: 'area', area: 'C', state: 'ACTIVE' },
  {
    kind: 'rec',
    id: 'r2',
    title: 'Stellplatznachweis',
    detail: 'Zwei Stellplätze gemäß örtlicher Satzung.',
  },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'verfahren', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'verfahren',
    role: 'assistant',
    delayMs: 0,
    text: 'Empfehlung: vereinfachtes Verfahren, Bauantrag mit neun Pflichtdokumenten.',
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
      'Good day. You are planning a single-family house at Hauptstraße 12 in Erlangen. We will walk through the legal classification together.',
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
    title: 'Pre-meeting with Erlangen permit office',
    detail: 'Schedule a procedure-clarification meeting with the case officer.',
  },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'sonstige', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'sonstige',
    role: 'assistant',
    delayMs: 0,
    text:
      'Erlangen parking ordinance requires two parking spaces. No encumbrances are recorded in the land register.',
  },
  { kind: 'area', area: 'C', state: 'ACTIVE' },
  {
    kind: 'rec',
    id: 'r2',
    title: 'Parking-space documentation',
    detail: 'Two parking spaces per local ordinance.',
  },
  { kind: 'pause', ms: 1500 },
  { kind: 'typing', specialist: 'verfahren', durationMs: 900 },
  {
    kind: 'msg',
    specialist: 'verfahren',
    role: 'assistant',
    delayMs: 0,
    text: 'Recommendation: simplified procedure, building application with nine mandatory documents.',
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
