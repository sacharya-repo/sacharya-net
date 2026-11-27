import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { NarrationSwitch } from './NarrationSwitch';
import { canNarrate, stopSpeaking } from './narration';
import { useStagePlayback } from './useStagePlayback';
import {
  evaluate,
  HARD_NULL_PCT,
  POLICY_VERSION,
  SCENARIOS,
  STAGES,
  type EvaluationInput,
  type EvaluationTrace,
  type GateDecision,
  type ScenarioId,
  type Strictness,
  type Tier,
} from './dq-control-engine';

type ViewMode = 'executive' | 'architect';

const TONE: Record<GateDecision, string> = {
  PROMOTE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  QUARANTINE: 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200',
  ESCALATE: 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200',
  REJECT: 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300',
  BLOCK: 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300',
};

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function DqControlDemo() {
  const formId = useId();
  const first = SCENARIOS[0];
  const [view, setView] = useState<ViewMode>('executive');
  const [scenarioId, setScenarioId] = useState<ScenarioId>(first.initial.scenarioId);
  const [observedNullPct, setObservedNullPct] = useState(first.initial.observedNullPct);
  const [driftCeilingPct, setDriftCeilingPct] = useState(first.initial.driftCeilingPct);
  const [strictness, setStrictness] = useState<Strictness>(first.initial.strictness);
  const [tier, setTier] = useState<Tier>(first.initial.tier);
  const [trace, setTrace] = useState<EvaluationTrace | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [narration, setNarration] = useState(true);
  const [voiceReady, setVoiceReady] = useState(true);
  const tokenRef = useRef(0);

  const input = useMemo<EvaluationInput>(
    () => ({
      scenarioId,
      observedNullPct,
      driftCeilingPct,
      strictness,
      tier,
    }),
    [scenarioId, observedNullPct, driftCeilingPct, strictness, tier],
  );

  const controlsKey = useMemo(() => evaluate(input).controls_key, [input]);
  const stale = trace !== null && trace.controls_key !== controlsKey;
  const settled = trace !== null && activeIndex >= trace.stages.length;
  const verdict = useMemo(() => {
    if (!trace) return '';
    if (view === 'executive') {
      return `${trace.decision}. ${trace.headline} ${trace.detail} ${trace.accountability}`;
    }
    return `${trace.decision}. ${trace.headline} Mode ${trace.mode}. Verb ${trace.verb}. Can release ${trace.can_release}. Quarantined rows ${trace.quarantined_rows}.`;
  }, [trace, view]);
  const { speaking } = useStagePlayback({
    narration,
    trace,
    labels: STAGES,
    activeIndex,
    setActiveIndex,
    tokenRef,
    view,
    verdict,
  });

  useEffect(() => {
    setVoiceReady(canNarrate());
  }, []);

  function applyScenario(id: ScenarioId) {
    stopSpeaking();
    const scenario = SCENARIOS.find((item) => item.id === id);
    if (!scenario) return;
    setScenarioId(scenario.initial.scenarioId);
    setObservedNullPct(scenario.initial.observedNullPct);
    setDriftCeilingPct(scenario.initial.driftCeilingPct);
    setStrictness(scenario.initial.strictness);
    setTier(scenario.initial.tier);
  }

  function runGate() {
    window.speechSynthesis?.resume();
    tokenRef.current += 1;
    setTrace(evaluate(input));
    setActiveIndex(0);
  }

  const ledger = trace ? (view === 'executive' ? trace.executive_ledger : trace.architect_ledger) : null;

  return (
    <form
      aria-label="DQ Control gate"
      onSubmit={(event) => {
        event.preventDefault();
        runGate();
      }}
      className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="flex flex-col gap-4 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-neutral-500 uppercase">
            Simulation · {POLICY_VERSION}
          </p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Same inputs, same ledger. Narration reads each stage in the browser voice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NarrationSwitch
            enabled={narration}
            speaking={speaking}
            supported={voiceReady}
            onChange={(next) => {
              if (!next) stopSpeaking();
              setNarration(next);
            }}
          />
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
                    <span
                      className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] ${TONE[scenario.startsAs]}`}
                    >
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
              id={`${formId}-null`}
              label="Observed null rate"
              valueLabel={percent(observedNullPct)}
              min={0}
              max={12}
              step={0.1}
              value={observedNullPct}
              onChange={setObservedNullPct}
            />
            <Slider
              id={`${formId}-ceiling`}
              label="Drift ceiling"
              valueLabel={percent(driftCeilingPct)}
              min={0.5}
              max={HARD_NULL_PCT}
              step={0.1}
              value={driftCeilingPct}
              onChange={setDriftCeilingPct}
            />
          </div>

          <Choice
            name={`${formId}-tier`}
            label="Autonomy tier"
            value={tier}
            onChange={setTier}
            options={[
              { value: 'L4', label: 'L4' },
              { value: 'L2', label: 'L2' },
              { value: 'L1', label: 'L1' },
            ]}
          />
          <p className="font-mono text-[11px] leading-relaxed text-neutral-500">
            L4 may release a pass. L2 and L1 hold it. A missing tier is L1.
          </p>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div>
              <p className="text-sm text-neutral-950 dark:text-white">Promote checks to gating</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                Advisory findings stay on the ledger and leave the mode unchanged. A gating check can quarantine rows or reject the unit.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={strictness === 'gating'}
              aria-label="Promote checks to gating"
              onClick={() => setStrictness((current) => (current === 'gating' ? 'advisory' : 'gating'))}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
                strictness === 'gating' ? 'bg-neutral-950 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition dark:bg-neutral-950 ${
                  strictness === 'gating' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="font-mono text-[11px] leading-relaxed text-neutral-500">
            Hard completeness break at {percent(HARD_NULL_PCT)} null · authority AUTH_MEDICAID · not a slider
          </p>

          <button
            type="submit"
            aria-label="Run DQ Gate"
            className="inline-flex h-10 items-center rounded-full border border-neutral-900 bg-neutral-950 px-4 text-[13px] font-medium text-white transition hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            {trace && !settled ? 'Running gate' : 'Run DQ Gate'}
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
                    mode {trace.mode} · verb {trace.verb} · can_release {String(trace.can_release)} · quarantine{' '}
                    {trace.quarantined_rows} · {trace.evaluation_ms} ms · {trace.ledger_hash}
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
                    ? 'Walking the gate from seal to the release predicate.'
                    : 'Choose a batch and run the gate. The decision is computed here, not requested.'}
                </p>
              </div>
            )}
          </div>

          {stale && settled && (
            <p className="mt-3 font-mono text-[11px] text-neutral-500" role="status">
              Inputs changed. Run the gate to refresh the ledger.
            </p>
          )}

          <ol aria-label="DQ gate pipeline" className="mt-4 space-y-2">
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
              {ledger && settled ? JSON.stringify(ledger, null, 2) : '{\n  "gate_decision": null\n}'}
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
