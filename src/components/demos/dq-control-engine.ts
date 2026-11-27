/**
 * Client-side model of the DQ Control gate.
 * Dispositions, mode, and release follow the control plane:
 * worst-of rollup, policy, floor, then the autonomy ceiling.
 * Payloads are counts and rates for synthetic profile ZZ.
 * Nothing here calls a network, and no record value is present.
 */

export const POLICY_VERSION = 'profile-zz@w1';
export const AUTHORITY = 'AUTH_MEDICAID';
export const HARD_NULL_PCT = 8;

export const STAGES = [
  { id: 'seal', label: 'Seal' },
  { id: 'bind', label: 'Bind' },
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'balance', label: 'Balance' },
  { id: 'mode', label: 'Mode' },
  { id: 'propose', label: 'Propose' },
  { id: 'release', label: 'Release' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];
export type GateDecision = 'PROMOTE' | 'QUARANTINE' | 'ESCALATE' | 'REJECT' | 'BLOCK';
export type Strictness = 'advisory' | 'gating';
export type Tier = 'L4' | 'L2' | 'L1';
export type ScenarioId = 'clean_extract' | 'null_drift' | 'broken_reference' | 'unbalanced_hop';
export type Disposition = 'PASS' | 'TA_WARN' | 'FAIL' | 'UNBALANCEABLE';
export type Mode = 'A' | 'H_ON' | 'H_IN' | 'H_IN_2';

export type EvaluationInput = {
  scenarioId: ScenarioId;
  observedNullPct: number;
  driftCeilingPct: number;
  strictness: Strictness;
  tier: Tier;
};

type CheckClass = 'completeness' | 'validity' | 'uniqueness' | 'referential' | 'balance';

type Check = {
  rule_id: string;
  check_class: CheckClass;
  disposition: Disposition;
  metric: number | null;
  threshold: number | null;
  scope: 'ROW' | 'UNIT' | 'HOP' | null;
  severable: boolean;
  element: string;
};

type ScenarioFacts = {
  id: ScenarioId;
  title: string;
  summary: string;
  startsAs: GateDecision;
  relation: string;
  pipeline: string;
  partner: string;
  batchId: string;
  rowCount: number;
  orphanKeys: number;
  abcResidual: number;
  hop: string;
  completenessRule: string;
  completenessElement: string;
  validityRule: string;
  uniquenessRule: string;
  referentialRule: string;
  initial: EvaluationInput;
};

export type Scenario = {
  id: ScenarioId;
  title: string;
  summary: string;
  startsAs: GateDecision;
  initial: EvaluationInput;
};

export type StageTrace = {
  id: StageId;
  latency_ms: number;
  executive: string;
  architect: string;
};

export type EvaluationTrace = {
  decision: GateDecision;
  headline: string;
  detail: string;
  accountability: string;
  mode: Mode;
  verb: string;
  can_release: boolean;
  quarantined_rows: number;
  prevented_rows: number;
  evaluation_ms: number;
  ledger_hash: string;
  controls_key: string;
  stages: StageTrace[];
  executive_ledger: Record<string, unknown>;
  architect_ledger: Record<string, unknown>;
};

const MODE_ORDER: Mode[] = ['A', 'H_ON', 'H_IN', 'H_IN_2'];
const RANK: Record<Disposition, number> = {
  PASS: 0,
  TA_WARN: 1,
  UNBALANCEABLE: 6,
  FAIL: 7,
};
const STAGE_BASE: Record<StageId, number> = {
  seal: 3,
  bind: 2,
  evaluate: 6,
  balance: 3,
  mode: 2,
  propose: 2,
  release: 4,
};

const SCENARIO_FACTS: readonly ScenarioFacts[] = [
  {
    id: 'clean_extract',
    title: 'Clean eligibility extract',
    summary: 'Coverage fields sit inside the ceiling. The hop reconciles. Mode A can promote.',
    startsAs: 'PROMOTE',
    relation: 'bronze.eligibility_span',
    pipeline: 'p_eligibility',
    partner: 'ZZ-IE',
    batchId: 'B-ZZ-2401',
    rowCount: 8400,
    orphanKeys: 0,
    abcResidual: 0,
    hop: 'FILE_TO_BRONZE',
    completenessRule: 'B-CMP-COVERAGE-END',
    completenessElement: 'coverage_end',
    validityRule: 'B-VAL-PROGRAM-CODE',
    uniquenessRule: 'B-UNQ-ELIGIBILITY-SPAN',
    referentialRule: 'B-REF-MEMBER-KEY',
    initial: {
      scenarioId: 'clean_extract',
      observedNullPct: 0.4,
      driftCeilingPct: 2,
      strictness: 'gating',
      tier: 'L4',
    },
  },
  {
    id: 'null_drift',
    title: 'Coverage null drift',
    summary: 'Null rate on coverage end is above the pinned ceiling. The failing rows are severable.',
    startsAs: 'QUARANTINE',
    relation: 'bronze.eligibility_span',
    pipeline: 'p_eligibility',
    partner: 'ZZ-IE',
    batchId: 'B-ZZ-2402',
    rowCount: 8400,
    orphanKeys: 0,
    abcResidual: 0,
    hop: 'FILE_TO_BRONZE',
    completenessRule: 'B-CMP-COVERAGE-END',
    completenessElement: 'coverage_end',
    validityRule: 'B-VAL-PROGRAM-CODE',
    uniquenessRule: 'B-UNQ-ELIGIBILITY-SPAN',
    referentialRule: 'B-REF-MEMBER-KEY',
    initial: {
      scenarioId: 'null_drift',
      observedNullPct: 3.1,
      driftCeilingPct: 2,
      strictness: 'gating',
      tier: 'L4',
    },
  },
  {
    id: 'broken_reference',
    title: 'Unknown member keys',
    summary: 'Encounter member keys do not resolve to a released eligibility span.',
    startsAs: 'REJECT',
    relation: 'bronze.encounter_header',
    pipeline: 'p_encounters',
    partner: 'ZZ-MCO-A',
    batchId: 'B-ZZ-2403',
    rowCount: 1260,
    orphanKeys: 14,
    abcResidual: 0,
    hop: 'FILE_TO_BRONZE',
    completenessRule: 'B-CMP-SVC-DATE',
    completenessElement: 'svc_date',
    validityRule: 'B-VAL-BILLING-NPI',
    uniquenessRule: 'B-UNQ-ENCOUNTER',
    referentialRule: 'B-REF-MEMBER-KEY',
    initial: {
      scenarioId: 'broken_reference',
      observedNullPct: 0.2,
      driftCeilingPct: 2,
      strictness: 'gating',
      tier: 'L4',
    },
  },
  {
    id: 'unbalanced_hop',
    title: 'Residual on the hop',
    summary: 'File-to-bronze counts do not reconcile. Release after an imbalance takes two people.',
    startsAs: 'BLOCK',
    relation: 'bronze.eligibility_span',
    pipeline: 'p_eligibility',
    partner: 'ZZ-IE',
    batchId: 'B-ZZ-2404',
    rowCount: 8400,
    orphanKeys: 0,
    abcResidual: 37,
    hop: 'FILE_TO_BRONZE',
    completenessRule: 'B-CMP-COVERAGE-END',
    completenessElement: 'coverage_end',
    validityRule: 'B-VAL-PROGRAM-CODE',
    uniquenessRule: 'B-UNQ-ELIGIBILITY-SPAN',
    referentialRule: 'B-REF-MEMBER-KEY',
    initial: {
      scenarioId: 'unbalanced_hop',
      observedNullPct: 0.4,
      driftCeilingPct: 2,
      strictness: 'gating',
      tier: 'L4',
    },
  },
];

export const SCENARIOS: readonly Scenario[] = SCENARIO_FACTS.map((facts) => ({
  id: facts.id,
  title: facts.title,
  summary: facts.summary,
  startsAs: facts.startsAs,
  initial: facts.initial,
}));

function factsFor(id: ScenarioId): ScenarioFacts {
  const facts = SCENARIO_FACTS.find((item) => item.id === id);
  if (!facts) return SCENARIO_FACTS[0];
  return facts;
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function ledgerHash(canonical: string): string {
  const left = fnv1a(canonical).toString(16).padStart(8, '0');
  const right = fnv1a(`${canonical}|dq-control`).toString(16).padStart(8, '0');
  return `dq_${left}${right}`;
}

function stageLatency(stage: StageId, seed: string): number {
  return STAGE_BASE[stage] + (fnv1a(`${stage}|${seed}`) % 7);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tenths(value: number): number {
  return Math.round(value * 10);
}

function rate(pct: number): number {
  return tenths(pct) / 1000;
}

function pctLabel(pct: number): string {
  return `${(tenths(pct) / 10).toFixed(1)}%`;
}

function rowsLabel(count: number): string {
  return count.toLocaleString('en-US');
}

function maxMode(left: Mode, right: Mode): Mode {
  return MODE_ORDER.indexOf(left) >= MODE_ORDER.indexOf(right) ? left : right;
}

function clampInput(input: EvaluationInput): EvaluationInput {
  const tier: Tier = input.tier === 'L2' || input.tier === 'L1' ? input.tier : 'L4';
  const strictness: Strictness = input.strictness === 'advisory' ? 'advisory' : 'gating';
  return {
    scenarioId: factsFor(input.scenarioId).id,
    observedNullPct: tenths(clamp(input.observedNullPct, 0, 12)) / 10,
    driftCeilingPct: tenths(clamp(input.driftCeilingPct, 0.5, HARD_NULL_PCT)) / 10,
    strictness,
    tier,
  };
}

function worstOf(checks: Check[]): Disposition {
  return checks.reduce((worst, check) => (RANK[check.disposition] > RANK[worst] ? check.disposition : worst), 'PASS');
}

function policyMode(disposition: Disposition): Mode {
  if (disposition === 'PASS' || disposition === 'TA_WARN') return 'A';
  return 'H_IN';
}

function tierCeiling(tier: Tier): Mode {
  return tier === 'L4' ? 'A' : 'H_IN';
}

type GateCore = {
  input: EvaluationInput;
  facts: ScenarioFacts;
  checks: Check[];
  worst: Disposition;
  mode: Mode;
  modeTrace: string[];
  decision: GateDecision;
  verb: string;
  can_release: boolean;
  quarantined_rows: number;
  prevented_rows: number;
  eligible_on_confirm: number;
  approvers: number;
  stepUp: boolean;
  sla: string | null;
};

function completenessCheck(input: EvaluationInput, facts: ScenarioFacts): Check {
  const overCeiling = tenths(input.observedNullPct) > tenths(input.driftCeilingPct);
  const hardBreak = tenths(input.observedNullPct) >= tenths(HARD_NULL_PCT);
  let disposition: Disposition = 'PASS';
  let scope: Check['scope'] = null;
  let severable = false;
  if (overCeiling && input.strictness === 'advisory') {
    disposition = 'TA_WARN';
  } else if (overCeiling && hardBreak) {
    disposition = 'FAIL';
    scope = 'UNIT';
  } else if (overCeiling) {
    disposition = 'FAIL';
    scope = 'ROW';
    severable = true;
  }
  return {
    rule_id: facts.completenessRule,
    check_class: 'completeness',
    disposition,
    metric: rate(input.observedNullPct),
    threshold: rate(input.driftCeilingPct),
    scope,
    severable,
    element: facts.completenessElement,
  };
}

function referentialCheck(input: EvaluationInput, facts: ScenarioFacts): Check {
  let disposition: Disposition = 'PASS';
  let scope: Check['scope'] = null;
  if (facts.orphanKeys > 0 && input.strictness === 'advisory') {
    disposition = 'TA_WARN';
  } else if (facts.orphanKeys > 0) {
    disposition = 'FAIL';
    scope = 'UNIT';
  }
  return {
    rule_id: facts.referentialRule,
    check_class: 'referential',
    disposition,
    metric: facts.orphanKeys,
    threshold: 0,
    scope,
    severable: false,
    element: 'member_key',
  };
}

function balanceCheck(facts: ScenarioFacts): Check {
  const failed = facts.abcResidual !== 0;
  return {
    rule_id: 'ABC-FILE-BRONZE',
    check_class: 'balance',
    disposition: failed ? 'UNBALANCEABLE' : 'PASS',
    metric: facts.abcResidual,
    threshold: 0,
    scope: failed ? 'HOP' : null,
    severable: false,
    element: facts.hop,
  };
}

function buildChecks(input: EvaluationInput, facts: ScenarioFacts): Check[] {
  return [
    completenessCheck(input, facts),
    {
      rule_id: facts.validityRule,
      check_class: 'validity',
      disposition: 'PASS',
      metric: null,
      threshold: null,
      scope: null,
      severable: false,
      element: facts.validityRule === 'B-VAL-BILLING-NPI' ? 'billing_npi' : 'program_code',
    },
    {
      rule_id: facts.uniquenessRule,
      check_class: 'uniqueness',
      disposition: 'PASS',
      metric: 0,
      threshold: 0,
      scope: null,
      severable: false,
      element: 'grain',
    },
    referentialCheck(input, facts),
    balanceCheck(facts),
  ];
}

function decide(input: EvaluationInput): GateCore {
  const facts = factsFor(input.scenarioId);
  const checks = buildChecks(input, facts);
  const worst = worstOf(checks);
  const modeTrace: string[] = [];
  let mode: Mode = 'A';

  const fromPolicy = policyMode(worst);
  modeTrace.push(`policy[${AUTHORITY}][${worst}] = ${fromPolicy}`);
  mode = maxMode(mode, fromPolicy);

  if (RANK[worst] >= 4) {
    mode = maxMode(mode, 'H_IN');
    modeTrace.push(`floor: ${worst} never autonomous -> ${'H_IN'}`);
  }
  if (facts.abcResidual !== 0) {
    mode = maxMode(mode, 'H_IN_2');
    modeTrace.push('floor: ABC failed in batch -> H_IN_2');
  }

  const ceiling = tierCeiling(input.tier);
  modeTrace.push(`tier: ${input.tier} ceiling -> ${ceiling}`);
  mode = maxMode(mode, ceiling);

  const unitFail = checks.some((check) => check.disposition === 'FAIL' && !check.severable);
  const rowFail = checks.some((check) => check.disposition === 'FAIL' && check.severable);
  const nullRows = Math.round((facts.rowCount * tenths(input.observedNullPct)) / 1000);

  let decision: GateDecision;
  let verb: string;
  if (facts.abcResidual !== 0) {
    decision = 'BLOCK';
    verb = 'HOLD';
  } else if (unitFail) {
    decision = 'REJECT';
    verb = 'REJECT';
  } else if (rowFail) {
    decision = 'QUARANTINE';
    verb = 'QUARANTINE_ROWS';
  } else if (mode !== 'A') {
    decision = 'ESCALATE';
    verb = 'HOLD';
  } else {
    decision = 'PROMOTE';
    verb = 'RELEASE';
  }

  const quarantined = decision === 'QUARANTINE' ? nullRows : 0;
  const prevented =
    decision === 'PROMOTE' ? 0 : decision === 'QUARANTINE' ? quarantined : facts.rowCount;
  const eligible = decision === 'QUARANTINE' ? facts.rowCount - quarantined : decision === 'PROMOTE' ? facts.rowCount : 0;

  const approvers = mode === 'H_IN_2' ? 2 : mode === 'H_IN' ? 1 : 0;
  const sla = mode === 'H_IN_2' ? 'PT48H' : mode === 'H_IN' ? 'PT24H' : mode === 'H_ON' ? 'PT1H' : null;

  return {
    input,
    facts,
    checks,
    worst,
    mode,
    modeTrace,
    decision,
    verb,
    can_release: decision === 'PROMOTE',
    quarantined_rows: quarantined,
    prevented_rows: prevented,
    eligible_on_confirm: eligible,
    approvers,
    stepUp: mode === 'H_IN_2',
    sla,
  };
}

function checkNote(check: Check, input: EvaluationInput, facts: ScenarioFacts): string {
  if (check.check_class === 'completeness') {
    if (check.disposition === 'PASS') {
      return `${check.element} null rate ${pctLabel(input.observedNullPct)} is within the ${pctLabel(input.driftCeilingPct)} ceiling.`;
    }
    if (check.disposition === 'TA_WARN') {
      return `${check.element} null rate ${pctLabel(input.observedNullPct)} is above the ceiling. The check is advisory, so the mode stays put.`;
    }
    if (check.scope === 'UNIT') {
      return `${check.element} null rate ${pctLabel(input.observedNullPct)} breaks the ${pctLabel(HARD_NULL_PCT)} completeness contract.`;
    }
    return `${check.element} null rate ${pctLabel(input.observedNullPct)} is above the ceiling. ${rowsLabel(Math.round((facts.rowCount * tenths(input.observedNullPct)) / 1000))} rows can be quarantined.`;
  }
  if (check.check_class === 'referential') {
    if (check.disposition === 'PASS') return 'Member keys resolve to a released eligibility span.';
    if (check.disposition === 'TA_WARN') {
      return `${facts.orphanKeys} member keys do not resolve. The check is advisory, so the unit is not rejected.`;
    }
    return `${facts.orphanKeys} member keys do not resolve. The encounter unit is withheld.`;
  }
  if (check.check_class === 'balance') {
    if (check.disposition === 'PASS') return `Residual on ${facts.hop} is 0.`;
    return `Residual on ${facts.hop} is ${facts.abcResidual}. The batch cannot release on its own.`;
  }
  if (check.check_class === 'validity') {
    return check.element === 'billing_npi'
      ? 'Billing NPI check digit passes on every present value.'
      : 'Program code is inside the closed list.';
  }
  return 'Grain is unique inside the batch.';
}

function narrative(core: GateCore): { headline: string; detail: string; accountability: string } {
  const { decision, facts, input, mode, quarantined_rows, verb, sla, approvers, stepUp } = core;
  const people =
    approvers === 0 ? 'no approver' : approvers === 1 ? 'one steward' : 'two approvers, distinct duties';
  const step = stepUp ? ' · checker step-up' : '';
  const clock = sla ? ` · SLA ${sla}` : '';
  const accountability = `Mode ${mode} · ${people}${step}${clock} · verb ${verb}`;

  if (decision === 'PROMOTE') {
    const advisory = core.checks.filter((check) => check.disposition === 'TA_WARN');
    if (advisory.length > 0) {
      return {
        headline: 'The batch can promote. Advisory findings stay on the ledger and leave the mode unchanged.',
        detail: `${advisory.map((check) => checkNote(check, input, facts)).join(' ')} Downstream readers of the released view would receive the full ${rowsLabel(facts.rowCount)} rows once the pointer flips.`,
        accountability,
      };
    }
    return {
      headline: 'The batch is eligible to promote. Downstream gold and outbound files can move with the pointer.',
      detail: `${rowsLabel(facts.rowCount)} rows on ${facts.relation} passed the gating checks. Residual is 0. A passing unit at mode A is the publisher's to release.`,
      accountability,
    };
  }

  if (decision === 'QUARANTINE') {
    return {
      headline: `${rowsLabel(quarantined_rows)} rows are proposed for quarantine. They do not propagate while the unit is held.`,
      detail: `Null rate on ${facts.completenessElement} is ${pctLabel(input.observedNullPct)}, above the ${pctLabel(input.driftCeilingPct)} ceiling and under the ${pctLabel(HARD_NULL_PCT)} contract break. ${rowsLabel(core.eligible_on_confirm)} rows become eligible only after a steward confirms the quarantine.`,
      accountability,
    };
  }

  if (decision === 'REJECT') {
    const hardNull = core.checks.some(
      (check) => check.check_class === 'completeness' && check.disposition === 'FAIL' && check.scope === 'UNIT',
    );
    if (hardNull && facts.orphanKeys === 0) {
      return {
        headline: 'The unit is rejected. A completeness break does not enter the released view.',
        detail: `Null rate on ${facts.completenessElement} is ${pctLabel(input.observedNullPct)}, at or above the ${pctLabel(HARD_NULL_PCT)} contract break. All ${rowsLabel(facts.rowCount)} rows stay off the next manifest version.`,
        accountability,
      };
    }
    return {
      headline: 'The unit is rejected. Unresolved member keys do not enter the released view.',
      detail: `${facts.orphanKeys} member keys on ${facts.relation} do not resolve to a released eligibility span. The batch is withheld as a unit. The previous pointer stays in place.`,
      accountability,
    };
  }

  if (decision === 'BLOCK') {
    return {
      headline: 'The hop does not balance. The batch stays on the current pointer.',
      detail: `Residual is ${facts.abcResidual} on ${facts.hop}. Release after an imbalance is a two-person decision with a step-up challenge. Analytics and any outbound file keep reading the last good manifest.`,
      accountability,
    };
  }

  return {
    headline: 'The checks passed. The autonomy ceiling still holds the batch for a person.',
    detail: `Tier ${input.tier} caps this release at ${mode}. Nothing is quarantined. The ${rowsLabel(facts.rowCount)} rows stay off the released view until someone with the duty confirms.`,
    accountability,
  };
}

function failedAssertions(checks: Check[]) {
  return checks
    .filter((check) => check.disposition === 'FAIL' || check.disposition === 'UNBALANCEABLE')
    .map((check) => ({
      rule_id: check.rule_id,
      check_class: check.check_class,
      disposition: check.disposition,
      metric: check.metric,
      threshold: check.threshold,
      scope: check.scope,
    }));
}

function advisoryFindings(checks: Check[]) {
  return checks
    .filter((check) => check.disposition === 'TA_WARN')
    .map((check) => ({
      rule_id: check.rule_id,
      check_class: check.check_class,
      disposition: check.disposition,
      metric: check.metric,
      threshold: check.threshold,
    }));
}

function buildStages(core: GateCore, seed: string): StageTrace[] {
  const { facts, input, checks, mode, modeTrace, decision, verb, quarantined_rows } = core;
  const rows = rowsLabel(facts.rowCount);
  const evaluateExec =
    core.worst === 'PASS'
      ? `Five checks returned PASS for ${AUTHORITY}. Counts and rates came back. Values did not.`
      : checks
          .filter((check) => check.disposition !== 'PASS')
          .map((check) => checkNote(check, input, facts))
          .join(' ');

  const texts: Record<StageId, { executive: string; architect: string }> = {
    seal: {
      executive: `Batch ${facts.batchId} is sealed against ${POLICY_VERSION}. ${rows} rows, key epoch e0. Record values stay in the data plane.`,
      architect: `seal batch=${facts.batchId} relation=${facts.relation} rows=${facts.rowCount} epoch=e0 profile=ZZ digest=${POLICY_VERSION} raw_values=withheld`,
    },
    bind: {
      executive: `Contract accepted for ${facts.relation}. Authority ${AUTHORITY}. Partner ${facts.partner}. Grain and program split are bound before any check runs.`,
      architect: `bind pipeline=${facts.pipeline} partner=${facts.partner} authority=${AUTHORITY} ordering=ORDERED undeclared_fields=0`,
    },
    evaluate: {
      executive: evaluateExec,
      architect: checks
        .map((check) => {
          const metric = check.metric === null ? 'metric=n/a' : `metric=${check.metric}`;
          const threshold = check.threshold === null ? 'threshold=n/a' : `threshold=${check.threshold}`;
          return `${check.rule_id} ${check.disposition} ${metric} ${threshold} scope=${check.scope ?? 'none'}`;
        })
        .join('\n'),
    },
    balance: {
      executive:
        facts.abcResidual === 0
          ? `The ${facts.hop} hop reconciles. Residual is 0, so the balance floor stays quiet.`
          : `Residual on ${facts.hop} is ${facts.abcResidual}. src_in does not equal the explained outs. The floor raises the mode to H_IN_2.`,
      architect: `abc hop=${facts.hop} residual=${facts.abcResidual} formula=src_in-(tgt_out+rejected+quarantined+deduplicated+filtered_by_contract+held)`,
    },
    mode: {
      executive: `Mode is ${mode}. The strictest of policy, floor, and the ${input.tier} ceiling wins. An advisory warning maps to the same mode as a pass.`,
      architect: modeTrace.join('\n'),
    },
    propose: {
      executive:
        verb === 'QUARANTINE_ROWS'
          ? `Proposed verb ${verb}. Dry-run quarantines ${rowsLabel(quarantined_rows)} rows and leaves the landed file untouched.`
          : `Proposed verb ${verb}. The planner returns a dry-run. Landed rows are not rewritten.`,
      architect: `propose verb=${verb} dry_run.rows_quarantined=${quarantined_rows} dry_run.rows_eligible_on_confirm=${core.eligible_on_confirm} rewrite=false`,
    },
    release: {
      executive:
        decision === 'PROMOTE'
          ? 'can_release is true. The publisher may write one manifest version and flip the pointer. This page records that decision. It does not publish.'
          : `can_release is false. The current pointer stays. ${decision === 'BLOCK' ? 'Two attestations and a step-up are still required.' : 'A bound human decision is still required.'}`,
      architect: `can_release=${core.can_release} mode=${mode} approvals=${core.approvers} step_up=${core.stepUp} state=${decision === 'PROMOTE' ? 'RELEASED' : 'HELD'} fingerprint=fp_${fnv1a(seed).toString(16).padStart(8, '0')}`,
    },
  };

  return STAGES.map((stage) => ({
    id: stage.id,
    latency_ms: stageLatency(stage.id, seed),
    executive: texts[stage.id].executive,
    architect: texts[stage.id].architect,
  }));
}

export function evaluate(raw: EvaluationInput): EvaluationTrace {
  const input = clampInput(raw);
  const core = decide(input);
  const story = narrative(core);
  const seed = JSON.stringify({
    batch: core.facts.batchId,
    ceiling: input.driftCeilingPct,
    gate: core.decision,
    mode: core.mode,
    nullPct: input.observedNullPct,
    orphans: core.facts.orphanKeys,
    quarantine: core.quarantined_rows,
    residual: core.facts.abcResidual,
    strictness: input.strictness,
    tier: input.tier,
    verb: core.verb,
  });
  const stages = buildStages(core, seed);
  const evaluation_ms = stages.reduce((sum, stage) => sum + stage.latency_ms, 0);
  const ledger_hash = ledgerHash(seed);
  const failed = failedAssertions(core.checks);
  const advisory = advisoryFindings(core.checks);
  const checksEvaluated = core.checks.map((check) => ({
    rule_id: check.rule_id,
    check_class: check.check_class,
    disposition: check.disposition,
    metric: check.metric,
    threshold: check.threshold,
  }));

  const shared = {
    gate_decision: core.decision,
    mode: core.mode,
    can_release: core.can_release,
    verb: core.verb,
    batch_id: core.facts.batchId,
    checks_evaluated: checksEvaluated,
    failed_assertions: failed,
    advisory_findings: advisory,
    quarantined_rows: core.quarantined_rows,
    prevented_rows: core.prevented_rows,
    evaluation_ms,
    ledger_hash,
  };

  return {
    decision: core.decision,
    headline: story.headline,
    detail: story.detail,
    accountability: story.accountability,
    mode: core.mode,
    verb: core.verb,
    can_release: core.can_release,
    quarantined_rows: core.quarantined_rows,
    prevented_rows: core.prevented_rows,
    evaluation_ms,
    ledger_hash,
    controls_key: seed,
    stages,
    executive_ledger: {
      ...shared,
      approvers_required: core.approvers,
      sla: core.sla,
      downstream:
        core.decision === 'PROMOTE'
          ? 'released view may advance'
          : 'current pointer stays; gold and outbound do not see this batch',
    },
    architect_ledger: {
      ...shared,
      authority: AUTHORITY,
      profile: 'ZZ',
      relation: core.facts.relation,
      pipeline: core.facts.pipeline,
      partner: core.facts.partner,
      strictness: input.strictness,
      tier: input.tier,
      worst_disposition: core.worst,
      mode_trace: core.modeTrace,
      row_count: core.facts.rowCount,
      orphan_keys: core.facts.orphanKeys,
      rows_eligible_on_confirm: core.eligible_on_confirm,
      abc: {
        hop: core.facts.hop,
        residual: core.facts.abcResidual,
        formula: 'src_in - (tgt_out + rejected + quarantined + deduplicated + filtered_by_contract + held)',
      },
      fingerprint: `fp_${fnv1a(seed).toString(16).padStart(8, '0')}`,
      epoch: 'e0',
      approvals: { required: core.approvers, checker_step_up: core.stepUp },
      sla: core.sla,
    },
  };
}
