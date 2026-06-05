export const meta = {
  name: 'forml-pipeline',
  description: 'Distill a cleaned elicitation transcript into FORM-L requirement atoms, then adversarially validate the pack→render loop: round-trip fidelity, FORM-L fit, and coverage. Returns atoms + verdicts + renders + an honest assessment (does the idea hold?).',
  phases: [
    { title: 'Extract', detail: '3 lenses (functional / constraint+NFR / business-rule) sweep the transcript' },
    { title: 'Merge', detail: 'dedup/merge across lenses, assign RA-XXXX ids + relations' },
    { title: 'Validate', detail: 'per-atom round-trip fidelity + FORM-L-fit judge' },
    { title: 'Coverage', detail: 'critic re-reads the full transcript for missed needs' },
    { title: 'Render', detail: 'project atoms to functional-req / user-story / dependency-map' },
    { title: 'Assess', detail: 'synthesize the verdict from aggregate scores' },
  ],
}

// ---- config: set REGISTRY to your clone path, or pass these via Workflow `args` ----
//   args: { registry, transcriptsDir, transcript, glossary, today }
const REGISTRY = (args && args.registry) || '/ABSOLUTE/PATH/TO/forml-reqs-registry'  // ← EDIT or pass args.registry
const TDIR = (args && args.transcriptsDir) || `${REGISTRY}/examples/transcript`       // folder holding your *_cleaned.md
const GLOSSARY = (args && args.glossary) || null                                      // optional: path to a domain glossary
const SPEC = `${REGISTRY}/spec/FORML-ATOM-SPEC.md`
const ATOMIZE_RULES = `${REGISTRY}/skills/atomize-from-latest/references/atomize-prompt.md`
const RENDER_RULES = `${REGISTRY}/skills/render-atoms/references/render-templates.md`

const transcriptName = (args && args.transcript) || '2024-01-15_sample-elicitation_cleaned.md'
const transcriptPath = `${TDIR}/${transcriptName}`

// ---- schemas ----
const SOURCE = {
  type: 'object', additionalProperties: false,
  required: ['transcript', 'quote'],
  properties: {
    transcript: { type: 'string' },
    timecode: { type: ['string', 'null'] },
    speaker: { type: ['string', 'null'] },
    quote: { type: 'string' },
  },
}
const ATOM_PROPS = {
  intent: { type: 'string' },
  kind: { type: 'string', enum: ['functional', 'nonfunctional', 'constraint', 'assumption', 'guard', 'business_rule'] },
  who: { type: 'string' }, where: { type: 'string' },
  when: { type: ['string', 'null'] }, what: { type: 'string' },
  how_well: { type: ['string', 'null'] }, else: { type: ['string', 'null'] },
  limit: { type: ['string', 'null'] }, signal: { type: ['string', 'null'] },
  assumptions: { type: 'array', items: { type: 'string' } },
  guards: { type: 'array', items: { type: 'string' } },
  observers: { type: 'array', items: { type: 'string' } },
  bindings: { type: 'array', items: { type: 'string' } },
  forml: { type: ['string', 'null'] },
  scenarios: {
    type: 'object', additionalProperties: false,
    properties: { nominal: { type: 'array', items: { type: 'string' } }, negative: { type: 'array', items: { type: 'string' } } },
  },
  verdict_policy: { type: ['string', 'null'] },
  levels: { type: 'array', items: { type: 'integer' } },
  jira: { type: 'array', items: { type: 'string' } },
  glossary_terms: { type: 'array', items: { type: 'string' } },
  confidence: { type: 'number' },
  source: { type: 'array', items: SOURCE, minItems: 1 },
  open_questions: { type: 'array', items: { type: 'string' } },
}
const EXTRACT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['atoms'],
  properties: { atoms: { type: 'array', items: { type: 'object', required: ['intent', 'kind', 'who', 'where', 'what', 'source'], properties: ATOM_PROPS } } },
}
const MERGE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['atoms', 'merge_notes'],
  properties: {
    atoms: { type: 'array', items: { type: 'object', required: ['id', 'slug', 'intent', 'kind', 'who', 'where', 'what', 'source'], properties: { id: { type: 'string', pattern: '^RA-[0-9]{4}$' }, slug: { type: 'string' }, relations: { type: 'object' }, ...ATOM_PROPS } } },
    merge_notes: { type: 'string' },
  },
}
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['id', 'round_trip', 'forml_fit'],
  properties: {
    id: { type: 'string' },
    round_trip: {
      type: 'object', additionalProperties: false, required: ['rendered_requirement', 'fidelity', 'faithful'],
      properties: {
        rendered_requirement: { type: 'string', description: 'the atom rendered back to a one-paragraph stakeholder requirement' },
        fidelity: { type: 'number', description: '0..1 — how faithfully the rendered req preserves the source quote intent' },
        faithful: { type: 'boolean' },
        lost: { type: 'array', items: { type: 'string' }, description: 'information present in the source but lost in the atom' },
      },
    },
    forml_fit: {
      type: 'object', additionalProperties: false, required: ['fits', 'score', 'rationale'],
      properties: {
        fits: { type: 'boolean' },
        score: { type: 'number', description: '0..1 — how naturally this requirement maps onto FORM-L slots' },
        forced_fields: { type: 'array', items: { type: 'string' }, description: 'fields that were forced / N/A / speculative for this business requirement' },
        rationale: { type: 'string' },
      },
    },
    notes: { type: 'string' },
  },
}
const COVERAGE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['coverage_estimate', 'missed'],
  properties: {
    coverage_estimate: { type: 'number', description: '0..1 — fraction of real needs in the transcript captured by the atom set' },
    missed: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['need', 'quote'], properties: { need: { type: 'string' }, quote: { type: 'string' }, timecode: { type: ['string', 'null'] }, why_missed: { type: 'string' } } } },
    notes: { type: 'string' },
  },
}

const ctx = `Requirements elicitation transcript, with [HH:MM:SS] **Speaker:** lines.
Read the atom contract first: ${SPEC}. Extraction & packing rules: ${ATOMIZE_RULES}.${GLOSSARY ? ` Glossary (read-only, for term-checking): ${GLOSSARY}.` : ''}
Transcript to process: \`${transcriptPath}\`.`

// ============ Extract (multi-lens sweep) ============
phase('Extract')
const LENSES = [
  { key: 'functional', focus: 'FUNCTIONAL behaviours the system must do — calculations, recommendations, exclusions, what is shown/produced. kind=functional.' },
  { key: 'constraint', focus: 'CONSTRAINTS, non-functional requirements, hard LIMITS and invariants, performance/SLO, data assumptions and guards. kind in {nonfunctional, constraint, guard, assumption}.' },
  { key: 'business', focus: 'BUSINESS RULES & exclusion/eligibility logic, thresholds, "without changing X", fallback for NULL/new items. kind=business_rule (or functional if it is a behaviour).' },
]
const lensResults = await parallel(LENSES.map(L => () =>
  agent(
    `${ctx}\n\nYou are a requirements extractor with ONE lens: ${L.focus}\n` +
    `Do verb-based content analysis over the WHOLE transcript through this lens only. Extract atomic needs and pack each into the FORM-L atom shape (fields per the spec). ` +
    `Rules: one need = one atom; MANDATORY source[] with verbatim quote + [timecode] + speaker; fill only what the transcript supports, use null / "N/A" / [] for the rest (do NOT invent thresholds, signals, or owners); set confidence honestly; add open_questions for anything unresolved. Do not assign ids. Return {atoms:[...]}.`,
    { schema: EXTRACT_SCHEMA, phase: 'Extract', label: `extract:${L.key}` }
  ).then(r => (r && r.atoms ? r.atoms.map(a => ({ ...a, _lens: L.key })) : []))
))
const rawAtoms = lensResults.filter(Boolean).flat()
log(`Extract: ${rawAtoms.length} candidate atoms across ${LENSES.length} lenses`)

// ============ Merge (barrier — needs all lenses) ============
phase('Merge')
const merged = await agent(
  `${ctx}\n\nThe registry is EMPTY (start ids at RA-0001). Here are candidate atoms from 3 extraction lenses (may overlap):\n` +
  `\`\`\`json\n${JSON.stringify(rawAtoms, null, 1)}\n\`\`\`\n\n` +
  `Merge them into a clean, deduplicated atom set per the dedup rules in ${ATOMIZE_RULES}:\n` +
  `- Same rule from multiple lenses → ONE atom, union the source[] quotes, keep the best-filled fields.\n` +
  `- Refinement → separate atom with relations.refines.\n- Contradiction → separate atoms with relations.conflicts_with + an open_question.\n` +
  `- Assign sequential ids RA-0001, RA-0002, … and a short ascii kebab \`slug\` per atom (≤6 words; transliterate non-ASCII).\n` +
  `- Set relations {depends_on, refines, conflicts_with, superseded_by:null} using the ids you assigned (a recommendation-filter rule typically depends_on the rule that defines the metric, etc.).\n` +
  `Drop the _lens helper field. Return {atoms:[...], merge_notes}.`,
  { schema: MERGE_SCHEMA, phase: 'Merge', label: 'merge-dedup' }
)
const atoms = (merged && merged.atoms) || []
log(`Merge: ${atoms.length} atoms after dedup`)
if (!atoms.length) return { transcript: transcriptName, error: 'no atoms extracted', rawCount: rawAtoms.length }

// ============ Validate + Coverage + Render (independent — run concurrently) ============
phase('Validate')
const [verdicts, coverage, fr, stories, depmap] = await Promise.all([
  parallel(atoms.map(a => () =>
    agent(
      `You adversarially validate ONE FORM-L requirement atom. Atom:\n\`\`\`json\n${JSON.stringify(a, null, 1)}\n\`\`\`\n\n` +
      `1) ROUND-TRIP: render this atom back into a single-paragraph natural-language stakeholder requirement. Then compare it to the atom's source[] quote(s). Score fidelity 0..1 (does the rendered requirement preserve what was actually said? what nuance/rationale is LOST in the atom form?). Set faithful=true only if a stakeholder would accept the rendered req as equivalent to the quote.\n` +
      `2) FORM-L FIT: judge how naturally THIS requirement maps onto FORM-L slots (WHO/WHERE/WHEN/WHAT/HOW_WELL/ELSE/LIMIT/SIGNAL). score 0..1; list forced_fields that were N/A/speculative/forced for this business requirement. Be skeptical — FORM-L was built for cyber-physical systems.\n` +
      `Return the verdict for id ${a.id}.`,
      { schema: VERDICT_SCHEMA, phase: 'Validate', label: `judge:${a.id}` }
    )
  )),
  agent(
    `${ctx}\n\nHere are the intents of the atoms extracted from the transcript:\n` +
    atoms.map(a => `- ${a.id}: ${a.intent}`).join('\n') +
    `\n\nRe-read the FULL transcript and act as a COVERAGE CRITIC (recall check): list genuine requirement-bearing needs that are present in the transcript but captured by NONE of the atoms above. For each: the need, a verbatim quote, its [timecode], and why it was likely missed. Estimate overall coverage 0..1. Be specific; ignore chit-chat/process talk.`,
    { schema: COVERAGE_SCHEMA, phase: 'Coverage', label: 'coverage-critic' }
  ),
  agent(`Render these atoms as FUNCTIONAL REQUIREMENTS + acceptance criteria, following the \`functional-req\` template in ${RENDER_RULES}. Use ONLY atom content; missing fields → [TBD]; keep a trace line per FR. Atoms:\n\`\`\`json\n${JSON.stringify(atoms, null, 1)}\n\`\`\`\nReturn the markdown only.`, { phase: 'Render', label: 'render:functional-req' }),
  agent(`Render these atoms as USER STORIES + AC (Given/When/Then), following the \`user-story\` template in ${RENDER_RULES}. Use ONLY atom content; missing → [TBD]; trace line per story. Atoms:\n\`\`\`json\n${JSON.stringify(atoms, null, 1)}\n\`\`\`\nReturn the markdown only.`, { phase: 'Render', label: 'render:user-story' }),
  agent(`Build a DEPENDENCY MAP (Mermaid graph TD) from these atoms' relations (depends_on/refines/conflicts_with), following the \`dependency-map\` template in ${RENDER_RULES}, plus a legend table id|intent|status. Atoms:\n\`\`\`json\n${JSON.stringify(atoms.map(a => ({ id: a.id, intent: a.intent, status: a.status || 'draft', relations: a.relations })), null, 1)}\n\`\`\`\nReturn the markdown only.`, { phase: 'Render', label: 'render:dependency-map' }),
])

const v = verdicts.filter(Boolean)
const avg = (xs) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
const aggregates = {
  atoms: atoms.length,
  avg_round_trip_fidelity: Number(avg(v.map(x => x.round_trip.fidelity)).toFixed(2)),
  faithful_count: v.filter(x => x.round_trip.faithful).length,
  avg_forml_fit: Number(avg(v.map(x => x.forml_fit.score)).toFixed(2)),
  forml_fits_count: v.filter(x => x.forml_fit.fits).length,
  coverage_estimate: coverage ? coverage.coverage_estimate : null,
  missed_count: coverage ? coverage.missed.length : null,
}
log(`Validate: fidelity=${aggregates.avg_round_trip_fidelity}, forml-fit=${aggregates.avg_forml_fit}, coverage=${aggregates.coverage_estimate}`)

// ============ Assess ============
phase('Assess')
const assessment = await agent(
  `You are a Principal BA judging whether a requirements approach holds up on real data. The approach: distill a raw elicitation transcript into formal FORM-L atoms, store them, and render them back to any abstraction level.\n\n` +
  `Aggregate results on transcript "${transcriptName}":\n\`\`\`json\n${JSON.stringify(aggregates, null, 1)}\n\`\`\`\n` +
  `Per-atom verdicts:\n\`\`\`json\n${JSON.stringify(v.map(x => ({ id: x.id, fidelity: x.round_trip.fidelity, faithful: x.round_trip.faithful, lost: x.round_trip.lost, forml_fits: x.forml_fit.fits, forced: x.forml_fit.forced_fields })), null, 1)}\n\`\`\`\n` +
  `Coverage critic found ${aggregates.missed_count} missed need(s).\n\n` +
  `Write a concise, intellectually honest assessment (~250-350 words): (1) does the pack→render loop hold — where is fidelity high vs lossy; (2) where does FORM-L genuinely fit vs strain for business/application requirements (cite forced fields); (3) the recall gap; (4) a clear verdict + 2-3 concrete next steps. Do not oversell.`,
  { phase: 'Assess', label: 'assessment' }
)

return {
  transcript: transcriptName,
  generated_for: (args && args.today) || null,
  atoms,
  validations: v,
  coverage,
  aggregates,
  renders: { functional_req: fr, user_story: stories, dependency_map: depmap },
  assessment,
}
