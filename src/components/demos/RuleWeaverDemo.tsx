import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  evaluate,
  HARD_CEILING,
  POLICY_VERSION,
  SCENARIOS,
  STAGES,
  type Decision,
  type EvaluationInput,
  type EvaluationTrace,
  type MemberStatus,
  type NetworkStatus,
  type ScenarioId,
} from './ruleweaver-engine';

type ViewMode = 'executive' | 'architect';

const TONE: Record<Decision, string> = {
  ALLOW: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  ESCALATE: 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200',
  DENY: 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300',
};

function money(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RuleWeaverDemo() {
  const formId = useId();
  const first = SCENARIOS[0];
  const [view, setView] = useState<ViewMode>('executive');
  const [scenarioId, setScenarioId] = useState<ScenarioId>(first.initial.scenarioId);
  const [memberStatus, setMemberStatus] = useState<MemberStatus>(first.initial.member_status);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(first.initial.network_status);
  const [claimAmount, setClaimAmount] = useState(first.initial.claim_amount);
  const [autoCeiling, setAutoCeiling] = useState(first.initial.autoCeiling);
  const [confidenceFloor, setConfidenceFloor] = useState(first.initial.confidenceFloor);
  const [blockUnpublished, setBlockUnpublished] = useState(first.initial.blockUnpublished);
  const [trace, setTrace] = useState<EvaluationTrace | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const tokenRef = useRef(0);

  const input = useMemo<EvaluationInput>(
    () => ({
      scenarioId,
      member_status: memberStatus,
      network_status: networkStatus,
      claim_type: 'professional',
      claim_amount: claimAmount,
      autoCeiling,
      confidenceFloor,
      blockUnpublished,
    }),
    [
      scenarioId,
      memberStatus,
      networkStatus,
      claimAmount,
      autoCeiling,
      confidenceFloor,
      blockUnpublished,
    ],
  );

  const controlsKey = useMemo(() => evaluate(input).controls_key, [input]);
  const stale = trace !== null && trace.controls_key !== controlsKey;
  const settled = trace !== null && activeIndex >= trace.stages.length;

  useEffect(() => {
    if (!trace || activeIndex < 0 || activeIndex >= trace.stages.length) return;
    const token = tokenRef.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActiveIndex(trace.stages.length);
      return;
    }
    const timer = window.setTimeout(() => {
      if (tokenRef.current === token) setActiveIndex((current) => current + 1);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [trace, activeIndex]);

  function applyScenario(id: ScenarioId) {
    const scenario = SCENARIOS.find((item) => item.id === id);
    if (!scenario) return;
    setScenarioId(scenario.initial.scenarioId);
    setMemberStatus(scenario.initial.member_status);
    setNetworkStatus(scenario.initial.network_status);
    setClaimAmount(scenario.initial.claim_amount);
    setAutoCeiling(scenario.initial.autoCeiling);
    setConfidenceFloor(scenario.initial.confidenceFloor);
    setBlockUnpublished(scenario.initial.blockUnpublished);
  }

  function runEvaluation() {
    tokenRef.current += 1;
    setTrace(evaluate(input));
    setActiveIndex(0);
  }

  const ledger = trace
    ? view === 'executive'
      ? trace.executive_ledger
      : trace.architect_ledger
    : null;

  return (
    <form
      aria-label="RuleWeaver evaluation"
      onSubmit={(event) => {
        event.preventDefault();
        runEvaluation();
      }}
      className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="flex flex-col gap-4 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-neutral-500 uppercase">
            Simulation · {POLICY_VERSION}
          </p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Same inputs, same ledger. The run stays in the browser.
          </p>
        </div>
        <fieldset className="shrink-0">
          <legend className="sr-only">View mode</legend>
          <div className="flex rounded-full border border-neutral-200 p-0.5 dark:border-neutral-800">
            {(
              [
                ['executive', 'Executive'],
                ['architect', 'Architect'],
              ] as const
            ).map(([id, label]) => (
              <label
                key={id}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#a68456] ${
                  view === id
                    ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <input
                  type="radio"
                  name={`${formId}-view`}
                  value={id}
                  checked={view === id}
                  onChange={() => setView(id)}
                  className="sr-only"
                  aria-label={`${label} view`}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-8 p-5 lg:grid-cols-12 lg:p-6">
        <div className="space-y-6 lg:col-span-5">
          <fieldset>
            <legend className="font-mono text-[10px] tracking-[0.16em] text-neutral-500 uppercase">
              Scenario
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SCENARIOS.map((scenario) => {
                const selected = scenario.id === scenarioId;
                return (
                  <label
                    key={scenario.id}
                    className={`cursor-pointer rounded-xl border p-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#a68456] ${
                      selected
                        ? 'border-neutral-950 bg-neutral-50 dark:border-white dark:bg-neutral-900/60'
                        : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${formId}-scenario`}
                      value={scenario.id}
                      checked={selected}
                      onChange={() => applyScenario(scenario.id)}
                      className="sr-only"
                      aria-label={scenario.title}
                    />
                    <span className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] ${TONE[scenario.startsAs]}`}>
                      {scenario.startsAs}
                    </span>
                    <span className="mt-2 block text-sm font-medium tracking-[-0.02em] text-neutral-950 dark:text-white">
                      {scenario.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {scenario.summary}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-5">
            <Slider
              id={`${formId}-amount`}
              label="Billed amount"
              valueLabel={money(claimAmount)}
              min={0}
              max={15000}
              step={10}
              value={claimAmount}
              onChange={setClaimAmount}
            />
            <Slider
              id={`${formId}-ceiling`}
              label="Auto-approve ceiling"
              valueLabel={money(autoCeiling)}
              min={100}
              max={5000}
              step={50}
              value={autoCeiling}
              onChange={setAutoCeiling}
            />
            <Slider
              id={`${formId}-floor`}
              label="Confidence floor"
              valueLabel={confidenceFloor.toFixed(2)}
              min={0.5}
              max={0.99}
              step={0.01}
              value={confidenceFloor}
              onChange={setConfidenceFloor}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Choice
              name={`${formId}-member`}
              label="Member status"
              value={memberStatus}
              onChange={setMemberStatus}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'TERMED', label: 'Termed' },
              ]}
            />
            <Choice
              name={`${formId}-network`}
              label="Network"
              value={networkStatus}
              onChange={setNetworkStatus}
              options={[
                { value: 'in_network', label: 'In network' },
                { value: 'out_of_network', label: 'Out of network' },
                { value: 'preferred', label: 'Preferred' },
              ]}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div>
              <p className="text-sm text-neutral-950 dark:text-white">Block unpublished rules</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                Review and draft rules stay out of the match. Turning this off lets them appear in the trace. It does not let them auto-approve.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={blockUnpublished}
              aria-label="Block unpublished rules from the match"
              onClick={() => setBlockUnpublished((current) => !current)}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
                blockUnpublished ? 'bg-neutral-950 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition dark:bg-neutral-950 ${
                  blockUnpublished ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="font-mono text-[11px] leading-relaxed text-neutral-500">
            Hard deny ceiling {money(HARD_CEILING)} · claim type professional · not a slider
          </p>

          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-full border border-neutral-900 bg-neutral-950 px-4 text-[13px] font-medium text-white transition hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            {trace && !settled ? 'Evaluating' : 'Run Evaluation'}
          </button>
        </div>

        <div className="lg:col-span-7">
          <div aria-live="polite" aria-atomic="true">
            {trace && settled ? (
              <div className={`rounded-xl border px-4 py-3 ${TONE[trace.decision]}`}>
                <p className="font-mono text-[11px] tracking-[0.16em] uppercase">{trace.decision}</p>
                <p className="mt-2 text-base font-medium tracking-[-0.02em]">{trace.headline}</p>
                {view === 'executive' && (
                  <>
                    <p className="mt-2 text-sm leading-relaxed opacity-90">{trace.detail}</p>
                    <p className="mt-3 font-mono text-[11px] leading-relaxed tracking-wide opacity-80">
                      {trace.accountability}
                    </p>
                  </>
                )}
                {view === 'architect' && (
                  <p className="mt-2 font-mono text-[11px] leading-relaxed">
                    reason {trace.reason} · matched {trace.matched_rules.join(', ') || 'none'} ·{' '}
                    {trace.evaluation_ms} ms · {trace.audit_hash}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-3 dark:border-neutral-700">
                <p className="font-mono text-[11px] tracking-[0.16em] text-neutral-500 uppercase">
                  {trace ? 'Running' : 'Idle'}
                </p>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {trace
                    ? 'Walking the registry from context to the ledger.'
                    : 'Choose a claim and run the registry. The decision is computed here, not requested.'}
                </p>
              </div>
            )}
          </div>

          {stale && settled && (
            <p className="mt-3 font-mono text-[11px] text-neutral-500" role="status">
              Inputs changed. Run evaluation to refresh the ledger.
            </p>
          )}

          <ol aria-label="Evaluation pipeline" className="mt-4 space-y-2">
            {STAGES.map((stage, index) => {
              const step = trace?.stages[index];
              const state =
                !trace || activeIndex < 0
                  ? 'wait'
                  : activeIndex > index
                    ? 'done'
                    : activeIndex === index
                      ? 'live'
                      : 'wait';
              return (
                <li
                  key={stage.id}
                  aria-current={state === 'live' ? 'step' : undefined}
                  className={`rounded-xl border px-3 py-3 ${
                    state === 'live'
                      ? 'border-neutral-950 bg-neutral-50 dark:border-white dark:bg-neutral-900/60'
                      : 'border-neutral-200 dark:border-neutral-800'
                  } ${state === 'wait' && trace ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-mono text-[11px] tracking-[0.16em] text-neutral-500 uppercase">
                      {String(index + 1).padStart(2, '0')} — {stage.label}
                    </p>
                    <p className="font-mono text-[11px] text-neutral-500">
                      {step && state !== 'wait' ? `${step.latency_ms} ms` : state}
                    </p>
                  </div>
                  {step && state !== 'wait' && (
                    <p
                      className={`mt-2 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 ${
                        view === 'architect' ? 'font-mono text-[11px] whitespace-pre-wrap' : ''
                      }`}
                    >
                      {view === 'architect' ? step.architect : step.executive}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <p className="font-mono text-[10px] tracking-[0.16em] text-neutral-500 uppercase">
                {view === 'executive' ? 'Decision ledger' : 'Audit ledger'}
              </p>
              {trace && settled && (
                <p className="font-mono text-[10px] text-neutral-500">{trace.evaluation_ms} ms</p>
              )}
            </div>
            <pre
              aria-label={view === 'executive' ? 'Decision ledger' : 'Audit ledger'}
              className="max-h-[28rem] overflow-auto p-3 font-mono text-[11px] leading-relaxed text-neutral-800 dark:text-neutral-200"
            >
              {ledger && settled
                ? JSON.stringify(ledger, null, 2)
                : '{\n  "decision": null\n}'}
            </pre>
          </div>
        </div>
      </div>
    </form>
  );
}

function Slider({
  id,
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-mono text-[10px] tracking-[0.16em] text-neutral-500 uppercase">
          {label}
        </label>
        <span className="font-mono text-xs text-neutral-950 dark:text-neutral-100">{valueLabel}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueLabel}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-neutral-950 dark:bg-neutral-800 dark:accent-white"
      />
    </div>
  );
}

function Choice<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="font-mono text-[10px] tracking-[0.16em] text-neutral-500 uppercase">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#a68456] ${
                selected
                  ? 'border-neutral-950 text-neutral-950 dark:border-white dark:text-white'
                  : 'border-neutral-200 text-neutral-500 dark:border-neutral-800'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
                aria-label={`${label}: ${option.label}`}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
