/**
 * Client-side model of RuleWeaver rule evaluation.
 * Operators, lifecycle, and validation findings follow the registry.
 * Payloads are synthetic. Nothing here calls a network.
 */

export const POLICY_VERSION = 'claims-adjudication@1.4.2';
export const ONTOLOGY_VERSION = 'healthcare@1.0';
export const HARD_CEILING = 10_000;

export const OPERATORS = [
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
] as const;

const OPERATOR_SET = new Set<string>(OPERATORS);

export const STAGES = [
  { id: 'context', label: 'Context' },
  { id: 'align', label: 'Align' },
  { id: 'match', label: 'Match' },
  { id: 'validate', label: 'Validate' },
  { id: 'govern', label: 'Govern' },
  { id: 'simulate', label: 'Simulate' },
  { id: 'ledger', label: 'Ledger' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];
export type Decision = 'ALLOW' | 'ESCALATE' | 'DENY';
export type RuleStatus = 'draft' | 'review' | 'approved' | 'published' | 'deprecated';
export type MemberStatus = 'ACTIVE' | 'TERMED';
export type NetworkStatus = 'in_network' | 'out_of_network' | 'preferred';

export type Reason =
  | 'published_match'
  | 'hitl_band'
  | 'hard_ceiling'
  | 'inactive_member'
  | 'confidence_floor'
  | 'explicit_escalate'
  | 'coverage_gap'
  | 'unpublished_excluded'
  | 'lifecycle_review'
  | 'blocked_mutation'
  | 'open_conflict';

export type ScenarioId = 'auto_approve' | 'hitl_ceiling' | 'hard_deny' | 'blocked_mutation';

export type EvaluationInput = {
  scenarioId: ScenarioId;
  member_status: MemberStatus;
  network_status: NetworkStatus;
  claim_type: 'professional';
  claim_amount: number;
  autoCeiling: number;
  confidenceFloor: number;
  blockUnpublished: boolean;
};

type ActionType = 'approve' | 'deny' | 'escalate' | 'mutate_paid_amount';

type Condition = {
  field: string;
  operator: string;
  value: string | number | string[];
  logical_operator: 'AND' | 'OR';
};

type RegistryRule = {
  rule_id: string;
  domain: 'claims';
  version: string;
  status: RuleStatus;
  description: string;
  confidence: number;
  conditions: Condition[];
  action_type: ActionType;
  action_data: Record<string, string | number>;
  evidence: { source: string; page: number; excerpt: string };
};

export type Scenario = {
  id: ScenarioId;
  title: string;
  summary: string;
  startsAs: Decision;
  initial: EvaluationInput;
};

export type StageTrace = {
  id: StageId;
  label: string;
  executive: string;
  architect: string;
  latency_ms: number;
};

export type EvaluationTrace = {
  input_key: string;
  controls_key: string;
  decision: Decision;
  reason: Reason;
  headline: string;
  detail: string;
  accountability: string;
  matched_rules: string[];
  blocked_rules: string[];
  evaluation_ms: number;
  policy_version: string;
  audit_hash: string;
  stages: StageTrace[];
  executive_ledger: Record<string, unknown>;
  architect_ledger: Record<string, unknown>;
};

const STAGE_BASE: Record<StageId, number> = {
  context: 6,
  align: 8,
  match: 11,
  validate: 14,
  govern: 9,
  simulate: 17,
  ledger: 4,
};

const CONTRADICTIONS: ReadonlyArray<readonly [string, string]> = [
  ['approve', 'deny'],
  ['approve', 'reject'],
  ['allow', 'deny'],
];

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'auto_approve',
    title: 'In-network auto-approve',
    summary: 'Active member, in network, billed at $240.',
    startsAs: 'ALLOW',
    initial: baseInput('auto_approve', 240),
  },
  {
    id: 'hitl_ceiling',
    title: 'Ceiling breach',
    summary: 'Billed at $2,400, between the auto-approve ceiling and the hard stop.',
    startsAs: 'ESCALATE',
    initial: baseInput('hitl_ceiling', 2400),
  },
  {
    id: 'hard_deny',
    title: 'Hard ceiling',
    summary: 'Billed at $12,500, above the published deny threshold.',
    startsAs: 'DENY',
    initial: baseInput('hard_deny', 12500),
  },
  {
    id: 'blocked_mutation',
    title: 'Blocked draft mutation',
    summary: 'A draft rule writes paid amount with an operator the schema rejects.',
    startsAs: 'DENY',
    initial: baseInput('blocked_mutation', 240),
  },
];

function baseInput(scenarioId: ScenarioId, claim_amount: number): EvaluationInput {
  return {
    scenarioId,
    member_status: 'ACTIVE',
    network_status: 'in_network',
    claim_type: 'professional',
    claim_amount,
    autoCeiling: 500,
    confidenceFloor: 0.8,
    blockUnpublished: true,
  };
}

function money(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function auditHash(canonical: string): string {
  const left = fnv1a(canonical).toString(16).padStart(8, '0');
  const right = fnv1a(`${canonical}|ruleweaver`).toString(16).padStart(8, '0');
  return `rw_${left}${right}`;
}

function stageLatency(stage: StageId, seed: string): number {
  return STAGE_BASE[stage] + (fnv1a(`${stage}|${seed}`) % 7);
}

function clampInput(input: EvaluationInput): EvaluationInput {
  return {
    ...input,
    claim_amount: clamp(Math.round(input.claim_amount), 0, 15_000),
    autoCeiling: clamp(Math.round(input.autoCeiling), 100, 5_000),
    confidenceFloor: Math.round(clamp(input.confidenceFloor, 0.5, 0.99) * 100) / 100,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function payloadRecord(input: EvaluationInput): Record<string, string | number> {
  return {
    member_status: input.member_status,
    network_status: input.network_status,
    claim_type: input.claim_type,
    claim_amount: input.claim_amount,
  };
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('|');
  return String(value);
}

function compare(operator: string, actual: unknown, expected: unknown): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'ne':
      return actual !== expected;
    case 'gt':
      return Number(actual) > Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'in':
      return Array.isArray(expected) && expected.some((item) => item === actual);
    case 'not_in':
      return Array.isArray(expected) && !expected.some((item) => item === actual);
    case 'contains':
      return String(actual).includes(String(expected));
    case 'starts_with':
      return String(actual).startsWith(String(expected));
    case 'ends_with':
      return String(actual).endsWith(String(expected));
    case 'regex':
      try {
        return new RegExp(String(expected)).test(String(actual));
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function contradicts(left: string, right: string): boolean {
  return CONTRADICTIONS.some(
    ([approve, deny]) =>
      (left === approve && right === deny) || (left === deny && right === approve),
  );
}

function schemaIssue(rule: RegistryRule): string | null {
  if (rule.conditions.length === 0) return 'Rule has no conditions defined';
  for (const condition of rule.conditions) {
    if (!OPERATOR_SET.has(condition.operator)) {
      return `Operator '${condition.operator}' is not valid`;
    }
    if (condition.value === undefined) return 'Condition is missing a value';
  }
  return null;
}

type Predicate = {
  rule_id: string;
  field: string;
  operator: string;
  expected: string;
  actual: string;
  passed: boolean;
};

type Assessment = {
  rule: RegistryRule;
  schema_issue: string | null;
  eligible: boolean;
  exclusion: string | null;
  condition_matched: boolean;
  matched: boolean;
  predicates: Predicate[];
};

function buildRegistry(input: EvaluationInput): RegistryRule[] {
  const ceiling = input.autoCeiling;
  const rules: RegistryRule[] = [
    {
      rule_id: 'RULE_CLM_001',
      domain: 'claims',
      version: '1.0',
      status: 'published',
      description: 'Auto-approve low-value in-network claims for active members',
      confidence: 0.91,
      conditions: [
        { field: 'member_status', operator: 'eq', value: 'ACTIVE', logical_operator: 'AND' },
        { field: 'network_status', operator: 'eq', value: 'in_network', logical_operator: 'AND' },
        { field: 'claim_amount', operator: 'lte', value: ceiling, logical_operator: 'AND' },
        {
          field: 'claim_type',
          operator: 'in',
          value: ['professional', 'dental', 'vision'],
          logical_operator: 'AND',
        },
      ],
      action_type: 'approve',
      action_data: { decision: 'AUTO_APPROVE', claim_status: 'approved' },
      evidence: {
        source: 'claims_policy.pdf',
        page: 4,
        excerpt:
          'Active members with in-network claims at or under the auto-approve ceiling may be adjudicated without manual review.',
      },
    },
    {
      rule_id: 'RULE_CLM_003',
      domain: 'claims',
      version: '1.2',
      status: 'published',
      description: 'Deny auto-adjudication when coverage is terminated',
      confidence: 0.94,
      conditions: [
        { field: 'member_status', operator: 'eq', value: 'TERMED', logical_operator: 'AND' },
      ],
      action_type: 'deny',
      action_data: { decision: 'DENY', claim_status: 'denied', reason: 'inactive_coverage' },
      evidence: {
        source: 'claims_policy.pdf',
        page: 6,
        excerpt: 'Terminated coverage is not auto-adjudicated.',
      },
    },
    {
      rule_id: 'RULE_CLM_009',
      domain: 'claims',
      version: '1.3',
      status: 'published',
      description: 'Out-of-network professional claims require manual review',
      confidence: 0.84,
      conditions: [
        {
          field: 'network_status',
          operator: 'eq',
          value: 'out_of_network',
          logical_operator: 'AND',
        },
        { field: 'claim_type', operator: 'eq', value: 'professional', logical_operator: 'AND' },
      ],
      action_type: 'escalate',
      action_data: { decision: 'ESCALATE', approval_type: 'review', priority: 'high' },
      evidence: {
        source: 'claims_policy.pdf',
        page: 9,
        excerpt: 'Out-of-network professional claims require a reviewer.',
      },
    },
    {
      rule_id: 'RULE_CLM_014',
      domain: 'claims',
      version: '2.0',
      status: 'published',
      description: 'Deny claims above the hard adjudication ceiling',
      confidence: 0.88,
      conditions: [
        { field: 'claim_amount', operator: 'gt', value: HARD_CEILING, logical_operator: 'AND' },
      ],
      action_type: 'deny',
      action_data: { decision: 'DENY', claim_status: 'denied', reason: 'hard_ceiling' },
      evidence: {
        source: 'claims_policy.pdf',
        page: 11,
        excerpt: 'Claims billed above the hard ceiling are denied.',
      },
    },
    {
      rule_id: 'RULE_CLM_027',
      domain: 'claims',
      version: '0.9',
      status: 'review',
      description: 'Candidate auto-approve for preferred-network claims under the ceiling',
      confidence: 0.97,
      conditions: [
        { field: 'member_status', operator: 'eq', value: 'ACTIVE', logical_operator: 'AND' },
        { field: 'network_status', operator: 'eq', value: 'preferred', logical_operator: 'AND' },
        { field: 'claim_amount', operator: 'lte', value: ceiling, logical_operator: 'AND' },
        {
          field: 'claim_type',
          operator: 'in',
          value: ['professional', 'dental', 'vision'],
          logical_operator: 'AND',
        },
      ],
      action_type: 'approve',
      action_data: { decision: 'AUTO_APPROVE', claim_status: 'approved' },
      evidence: {
        source: 'claims_policy.pdf',
        page: 12,
        excerpt:
          'Preferred-network claims under the ceiling are candidates for auto-approval once the rule is published.',
      },
    },
  ];

  if (input.scenarioId === 'blocked_mutation') {
    rules.push({
      rule_id: 'RULE_CLM_022',
      domain: 'claims',
      version: '0.3',
      status: 'draft',
      description: 'Extracted draft that overwrites paid amount from an approximate match',
      confidence: 0.42,
      conditions: [
        { field: 'claim_amount', operator: 'approx', value: ceiling, logical_operator: 'AND' },
      ],
      action_type: 'mutate_paid_amount',
      action_data: { paid_amount: 'claim_amount' },
      evidence: {
        source: 'claims_policy.pdf',
        page: 2,
        excerpt: 'Approximate the paid amount to the billed amount.',
      },
    });
  }

  return rules;
}

function assessRule(rule: RegistryRule, input: EvaluationInput): Assessment {
  const issue = schemaIssue(rule);
  const payload = payloadRecord(input);
  const predicates: Predicate[] = issue
    ? []
    : rule.conditions.map((condition) => {
        const actual = payload[condition.field];
        return {
          rule_id: rule.rule_id,
          field: condition.field,
          operator: condition.operator,
          expected: displayValue(condition.value),
          actual: displayValue(actual),
          passed: compare(condition.operator, actual, condition.value),
        };
      });

  let conditionMatched = false;
  if (!issue && predicates.length > 0) {
    conditionMatched = predicates[0].passed;
    for (let index = 1; index < predicates.length; index += 1) {
      const operator = rule.conditions[index - 1].logical_operator;
      conditionMatched =
        operator === 'OR'
          ? conditionMatched || predicates[index].passed
          : conditionMatched && predicates[index].passed;
    }
  }

  const unpublished = rule.status !== 'published';
  const eligible = !issue && !(unpublished && input.blockUnpublished) && rule.status !== 'deprecated';
  const exclusion = unpublished && input.blockUnpublished ? `status ${rule.status}` : null;

  return {
    rule,
    schema_issue: issue,
    eligible,
    exclusion,
    condition_matched: conditionMatched,
    matched: conditionMatched && eligible,
    predicates,
  };
}

function firingConflicts(matched: Assessment[]): Array<Record<string, string>> {
  const conflicts: Array<Record<string, string>> = [];
  for (let left = 0; left < matched.length; left += 1) {
    for (let right = left + 1; right < matched.length; right += 1) {
      const a = matched[left];
      const b = matched[right];
      if (!contradicts(a.rule.action_type, b.rule.action_type)) continue;
      conflicts.push({
        rule_id_1: a.rule.rule_id,
        rule_id_2: b.rule.rule_id,
        conflict_type: 'contradictory_actions',
        severity: 'high',
        resolution_status: 'open',
        description: `${a.rule.rule_id} and ${b.rule.rule_id} both match and disagree on the action`,
      });
    }
  }
  return conflicts;
}

type Verdict = {
  decision: Decision;
  reason: Reason;
  primary: Assessment | null;
};

function verdictFor(assessments: Assessment[], input: EvaluationInput): Verdict {
  const mutation = assessments.find((item) => item.rule.action_type === 'mutate_paid_amount');
  if (mutation?.schema_issue || (mutation && mutation.rule.status !== 'published')) {
    return { decision: 'DENY', reason: 'blocked_mutation', primary: mutation };
  }

  const matched = assessments.filter((item) => item.matched);
  const conflicted = firingConflicts(matched);
  if (conflicted.length > 0) {
    return { decision: 'DENY', reason: 'open_conflict', primary: matched[0] ?? null };
  }

  const confident = (item: Assessment) => item.rule.confidence >= input.confidenceFloor;
  const deny = matched.find((item) => item.rule.action_type === 'deny');
  const approve = matched.find((item) => item.rule.action_type === 'approve' && item.rule.status === 'published');
  const escalate = matched.find((item) => item.rule.action_type === 'escalate');
  const reviewApprove = matched.find(
    (item) => item.rule.action_type === 'approve' && item.rule.status !== 'published',
  );

  if (deny && confident(deny)) {
    return {
      decision: 'DENY',
      reason: deny.rule.rule_id === 'RULE_CLM_003' ? 'inactive_member' : 'hard_ceiling',
      primary: deny,
    };
  }
  if (deny && !confident(deny)) {
    return { decision: 'ESCALATE', reason: 'confidence_floor', primary: deny };
  }
  if (approve && confident(approve)) {
    return { decision: 'ALLOW', reason: 'published_match', primary: approve };
  }
  if (approve && !confident(approve)) {
    return { decision: 'ESCALATE', reason: 'confidence_floor', primary: approve };
  }
  if (escalate && confident(escalate)) {
    return { decision: 'ESCALATE', reason: 'explicit_escalate', primary: escalate };
  }
  if (escalate && !confident(escalate)) {
    return { decision: 'ESCALATE', reason: 'confidence_floor', primary: escalate };
  }
  if (reviewApprove) {
    return { decision: 'ESCALATE', reason: 'lifecycle_review', primary: reviewApprove };
  }

  const shadow = assessments.find(
    (item) => item.condition_matched && !item.matched && item.exclusion && !item.schema_issue,
  );
  if (shadow) {
    return { decision: 'ESCALATE', reason: 'unpublished_excluded', primary: shadow };
  }

  const inBand =
    input.member_status === 'ACTIVE' &&
    input.network_status === 'in_network' &&
    input.claim_amount > input.autoCeiling &&
    input.claim_amount <= HARD_CEILING;

  if (inBand) return { decision: 'ESCALATE', reason: 'hitl_band', primary: null };
  return { decision: 'ESCALATE', reason: 'coverage_gap', primary: null };
}

function resultType(decision: Decision, reason: Reason): string {
  if (reason === 'blocked_mutation' || reason === 'open_conflict') return 'validation_failure';
  if (decision === 'ESCALATE') return 'warning';
  return 'success';
}

function artifactStatus(decision: Decision): 'eligible' | 'withheld' {
  return decision === 'ALLOW' ? 'eligible' : 'withheld';
}

type Copy = { headline: string; detail: string; accountability: string };

function narrative(
  verdict: Verdict,
  input: EvaluationInput,
  publishedDecision: Decision | null,
): Copy {
  const rule = verdict.primary?.rule;
  const floor = input.confidenceFloor.toFixed(2);
  const ceiling = money(input.autoCeiling);
  const amount = money(input.claim_amount);

  switch (verdict.reason) {
    case 'published_match':
      return {
        headline: 'Auto-approve. This claim can move without a reviewer.',
        detail: `${rule?.rule_id ?? 'The published rule'} is published, every condition holds, and confidence ${rule?.confidence.toFixed(2)} clears the floor of ${floor}. Adjudication may advance. The ELT model may reference the rule id. It does not copy the ceiling into SQL.`,
        accountability: 'No person is in the loop. The published registry is the authority, and the ledger is the record.',
      };
    case 'hitl_band':
      return {
        headline: 'Human review. The billed amount sits between two published thresholds.',
        detail: `${amount} is above the auto-approve ceiling of ${ceiling} and at or under the hard stop of ${money(HARD_CEILING)}. No published action covers that band. An approval stays pending, and claim status is not written.`,
        accountability: 'Assigned role: Claims reviewer. The gap is a policy choice. The evaluator does not invent a rule to fill it.',
      };
    case 'hard_ceiling':
      return {
        headline: 'Denied by published policy. The billed amount is above the hard ceiling.',
        detail: `${rule?.rule_id} matched at ${amount}. The evaluation succeeded: the rule fired as written. No paid amount is written.`,
        accountability: 'Authority is the published rule. A reviewer is not required for this deny, and the extraction model is not consulted.',
      };
    case 'inactive_member':
      return {
        headline: 'Denied. Coverage is terminated.',
        detail: `${rule?.rule_id} matches member_status TERMED. Inactive coverage does not auto-adjudicate, at ${amount} or any other billed amount under this pack.`,
        accountability: 'Published rule. The deny does not wait on a reviewer.',
      };
    case 'confidence_floor':
      return {
        headline: 'Held for review. The matching rule is under the confidence floor.',
        detail: `${rule?.rule_id} matched with confidence ${rule?.confidence.toFixed(2)}, below the floor of ${floor}. A weak extraction cannot auto-approve or auto-deny.`,
        accountability: 'A claims reviewer confirms the extraction before the action can apply.',
      };
    case 'explicit_escalate':
      return {
        headline: 'Human review. A published rule routes this claim to a person.',
        detail: `${rule?.rule_id} matched and its action is escalate. ${rule?.description}.`,
        accountability: 'Claims reviewer. The approval cannot proceed until someone decides it.',
      };
    case 'coverage_gap':
      return {
        headline: 'Human review. No published rule covers this claim.',
        detail: `Member ${input.member_status}, network ${input.network_status}, ${amount}. The safe decision is escalate. Silence is not an approval.`,
        accountability: 'Claims reviewer, until a rule is simulated and published for this case.',
      };
    case 'unpublished_excluded':
      return {
        headline: 'Human review. A candidate rule was kept out of the match.',
        detail: `${rule?.rule_id} would match and its status is ${rule?.status}. Unpublished rules are blocked, so it was not evaluated as an action.`,
        accountability: 'Publication is still open. Blocking the rule is not the same as approving the claim.',
      };
    case 'lifecycle_review':
      return {
        headline: 'Held. A rule matched and is not published.',
        detail: `${rule?.rule_id} matched with status ${rule?.status}. Matching is not permission to apply it. Auto-approve requires status published.`,
        accountability: 'The rule stays with its reviewer. Turning off the unpublished block only lets the rule enter the trace.',
      };
    case 'open_conflict':
      return {
        headline: 'Blocked. Two published rules match and disagree.',
        detail: 'The conflict type is contradictory_actions and the resolution status is open. Neither action is applied until a person resolves the pair.',
        accountability: 'A reviewer owns the conflict. The evaluator will not pick a winner.',
      };
    case 'blocked_mutation':
      return {
        headline: 'Blocked. The draft rule cannot write a paid amount.',
        detail: `${rule?.rule_id} is ${rule?.status}. ${rule ? `${schemaIssue(rule) ?? 'The action is a mutation'}.` : 'The mutation failed validation.'} The write is refused.${
          publishedDecision
            ? ` On the published registry alone, this claim would be ${publishedDecision}.`
            : ''
        }`,
        accountability:
          'Validation rejects the rule. Governance does not open a path around the operator allow-list.',
      };
    default:
      return {
        headline: 'Held for review.',
        detail: 'The registry did not produce an auto-apply decision.',
        accountability: 'Claims reviewer.',
      };
  }
}

function alignmentLines(input: EvaluationInput): string[] {
  const amount = money(input.claim_amount);
  return [
    `member_status ${input.member_status} → Member (alias; ACTIVE means termination_date is empty)`,
    `network_status ${input.network_status} → Provider.network_status`,
    `claim_amount ${amount} → Claim.billed_amount`,
    `claim_type ${input.claim_type} → Claim.claim_type`,
    `ontology ${ONTOLOGY_VERSION}`,
  ];
}

function buildStages(
  input: EvaluationInput,
  assessments: Assessment[],
  verdict: Verdict,
  conflicts: Array<Record<string, string>>,
  latencies: Record<StageId, number>,
): StageTrace[] {
  const published = assessments.filter((item) => item.rule.status === 'published').length;
  const matched = assessments.filter((item) => item.matched);
  const schemaFailures = assessments.filter((item) => item.schema_issue);
  const excluded = assessments.filter((item) => item.exclusion);
  const gap =
    verdict.reason === 'hitl_band' || verdict.reason === 'coverage_gap'
      ? verdict.reason
      : null;

  const matchLines = assessments.map((item) => {
    if (item.schema_issue) return `${item.rule.rule_id} schema_rejected — ${item.schema_issue}`;
    if (item.exclusion) {
      const would = item.condition_matched ? 'conditions hold' : 'conditions do not hold';
      return `${item.rule.rule_id} excluded (${item.exclusion}; ${would})`;
    }
    if (item.matched) {
      return `${item.rule.rule_id} matched → ${item.rule.action_type} @ ${item.rule.confidence.toFixed(2)}`;
    }
    const failed = item.predicates.filter((predicate) => !predicate.passed).map((predicate) => predicate.field);
    return `${item.rule.rule_id} miss — ${failed.join(', ') || 'no predicate'}`;
  });

  const predicateLines = assessments
    .filter((item) => item.predicates.length > 0 && (item.matched || item.condition_matched))
    .flatMap((item) =>
      item.predicates.map(
        (predicate) =>
          `${predicate.rule_id} ${predicate.field} ${predicate.operator} ${predicate.expected} ← ${predicate.actual} ${predicate.passed ? 'pass' : 'fail'}`,
      ),
    );

  const executive: Record<StageId, string> = {
    context: `Policy ${POLICY_VERSION} is the authority for this run. ${published} rules are published.`,
    align: 'The claim is bound to Member, Provider, and Claim. No member identifier is on the payload.',
    match:
      matched.length > 0
        ? `${matched.map((item) => item.rule.rule_id).join(', ')} matched.`
        : 'No eligible rule matched.',
    validate:
      schemaFailures.length > 0
        ? 'An operator outside the allow-list failed validation.'
        : gap
          ? 'Validation records a coverage gap. That gap is the escalate.'
          : conflicts.length > 0
            ? 'Two matching rules disagree. The conflict stays open.'
            : 'No co-firing conflict. Completeness holds for the rules that matched.',
    govern:
      verdict.decision === 'ALLOW'
        ? 'Lifecycle is published, confidence clears the floor, and the action may apply.'
        : verdict.decision === 'DENY'
          ? 'The action is refused. Claim status is not advanced by this run.'
          : 'The run returns to a person. can_proceed is false.',
    simulate:
      verdict.decision === 'ALLOW'
        ? 'Dry-run succeeded. An artifact may reference the rule. The threshold stays in the registry.'
        : 'Dry-run withheld the write. Simulation still completes, so the refusal is explainable.',
    ledger: 'Allow, escalate, and deny all append a ledger row. The checksum covers this input.',
  };

  const architect: Record<StageId, string> = {
    context: [
      `policy ${POLICY_VERSION}`,
      `rules ${assessments.length} (${published} published)`,
      `block_unpublished ${input.blockUnpublished}`,
      `confidence_floor ${input.confidenceFloor.toFixed(2)}`,
      `auto_ceiling ${input.autoCeiling}`,
      `hard_ceiling ${HARD_CEILING}`,
    ].join('\n'),
    align: alignmentLines(input).join('\n'),
    match: [...matchLines, ...predicateLines].join('\n'),
    validate: [
      `validation_types conflict, completeness, consistency`,
      schemaFailures.length
        ? schemaFailures.map((item) => `${item.rule.rule_id}: ${item.schema_issue}`).join('\n')
        : 'schema: clean',
      conflicts.length ? conflicts.map((item) => item.description).join('\n') : 'co-firing conflicts: 0',
      excluded.length
        ? `excluded: ${excluded.map((item) => item.rule.rule_id).join(', ')}`
        : 'excluded: none',
      gap ? `gap: ${gap}` : 'gap: none',
    ].join('\n'),
    govern: [
      `decision ${verdict.decision}`,
      `reason ${verdict.reason}`,
      verdict.decision === 'ESCALATE'
        ? 'approval_type review · status pending · can_proceed false · role Claims reviewer'
        : verdict.decision === 'ALLOW'
          ? 'recommendation approve · can_proceed true'
          : 'recommendation reject · can_proceed false',
    ].join('\n'),
    simulate: [
      `simulation_type rule`,
      `result_type ${resultType(verdict.decision, verdict.reason)}`,
      `artifact ${artifactStatus(verdict.decision)}`,
      verdict.primary ? `entity ${verdict.primary.rule.rule_id}@${verdict.primary.rule.version}` : 'entity governance_policy',
    ].join('\n'),
    ledger: `audit append · policy ${POLICY_VERSION} · decision ${verdict.decision}`,
  };

  return STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    executive: executive[stage.id],
    architect: architect[stage.id],
    latency_ms: latencies[stage.id],
  }));
}

export function evaluate(raw: EvaluationInput): EvaluationTrace {
  const input = clampInput(raw);
  const assessments = buildRegistry(input).map((rule) => assessRule(rule, input));
  const verdict = verdictFor(assessments, input);
  const withoutMutation = assessments.filter((item) => item.rule.action_type !== 'mutate_paid_amount');
  const publishedVerdict =
    input.scenarioId === 'blocked_mutation' ? verdictFor(withoutMutation, input) : null;
  const matched = assessments.filter((item) => item.matched);
  const blocked = assessments.filter(
    (item) => item.rule.action_type === 'mutate_paid_amount' && (item.schema_issue || item.rule.status !== 'published'),
  );
  const conflicts = firingConflicts(matched);
  const controlsKey = JSON.stringify({
    scenario: input.scenarioId,
    payload: payloadRecord(input),
    auto_ceiling: input.autoCeiling,
    confidence_floor: input.confidenceFloor,
    block_unpublished: input.blockUnpublished,
  });
  const canonical = JSON.stringify({
    ...JSON.parse(controlsKey),
    decision: verdict.decision,
    reason: verdict.reason,
    matched_rules: matched.map((item) => item.rule.rule_id),
  });
  const hash = auditHash(canonical);
  const latencies = Object.fromEntries(
    STAGES.map((stage) => [stage.id, stageLatency(stage.id, canonical)]),
  ) as Record<StageId, number>;
  const evaluationMs = STAGES.reduce((sum, stage) => sum + latencies[stage.id], 0);
  const copy = narrative(verdict, input, publishedVerdict?.decision ?? null);
  const stages = buildStages(input, assessments, verdict, conflicts, latencies);
  const matchedIds = matched.map((item) => item.rule.rule_id);
  const blockedIds = blocked.map((item) => item.rule.rule_id);

  const executiveLedger = {
    decision: verdict.decision,
    matched_rules: matchedIds,
    blocked_rules: blockedIds,
    evaluation_ms: evaluationMs,
    policy_version: POLICY_VERSION,
    audit_hash: hash,
  };

  const architectLedger = {
    ...executiveLedger,
    reason: verdict.reason,
    run_id: `run_${hash.slice(3, 11)}`,
    ontology_version: ONTOLOGY_VERSION,
    payload: payloadRecord(input),
    controls: {
      auto_ceiling: input.autoCeiling,
      hard_ceiling: HARD_CEILING,
      confidence_floor: input.confidenceFloor,
      block_unpublished: input.blockUnpublished,
    },
    published_registry_decision: publishedVerdict?.decision ?? verdict.decision,
    rules: assessments.map((item) => ({
      rule_id: item.rule.rule_id,
      version: item.rule.version,
      status: item.rule.status,
      confidence: item.rule.confidence,
      action_type: item.rule.action_type,
      eligible: item.eligible,
      matched: item.matched,
      schema_issue: item.schema_issue,
      evidence: item.rule.evidence,
      predicates: item.predicates,
    })),
    conflicts,
    gaps:
      verdict.reason === 'hitl_band' || verdict.reason === 'coverage_gap'
        ? [{ gap_type: verdict.reason, severity: 'medium' }]
        : [],
    simulation: {
      simulation_name: 'claims-adjudication-demo',
      simulation_type: 'rule',
      status: 'completed',
      result_type: resultType(verdict.decision, verdict.reason),
      entity_type: verdict.primary ? 'rule' : 'governance_policy',
      entity_rule_id: verdict.primary?.rule.rule_id ?? null,
      execution_time_ms: evaluationMs,
    },
    approval:
      verdict.decision === 'ESCALATE'
        ? {
            approval_type: 'review',
            status: 'pending',
            priority: verdict.reason === 'explicit_escalate' ? 'high' : 'normal',
            can_proceed: false,
            assigned_role: 'Claims reviewer',
          }
        : {
            approval_type: verdict.decision === 'ALLOW' ? 'publication' : 'review',
            status: verdict.decision === 'ALLOW' ? 'approved' : 'rejected',
            can_proceed: verdict.decision === 'ALLOW',
          },
    artifact: {
      status: artifactStatus(verdict.decision),
      engine: 'dbt',
      model: 'claims_adjudication',
      rules_applied: verdict.decision === 'ALLOW' ? matchedIds : [],
    },
    latency_ms: latencies,
  };

  return {
    input_key: canonical,
    controls_key: controlsKey,
    decision: verdict.decision,
    reason: verdict.reason,
    headline: copy.headline,
    detail: copy.detail,
    accountability: copy.accountability,
    matched_rules: matchedIds,
    blocked_rules: blockedIds,
    evaluation_ms: evaluationMs,
    policy_version: POLICY_VERSION,
    audit_hash: hash,
    stages,
    executive_ledger: executiveLedger,
    architect_ledger: architectLedger,
  };
}

function assertFixtures(): void {
  const expected: Record<ScenarioId, Decision> = {
    auto_approve: 'ALLOW',
    hitl_ceiling: 'ESCALATE',
    hard_deny: 'DENY',
    blocked_mutation: 'DENY',
  };
  for (const scenario of SCENARIOS) {
    const trace = evaluate(scenario.initial);
    if (trace.decision !== expected[scenario.id]) {
      throw new Error(`${scenario.id} produced ${trace.decision}, expected ${expected[scenario.id]}`);
    }
  }
}

assertFixtures();
