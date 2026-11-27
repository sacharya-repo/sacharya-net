const stages = [
  ['01 Context', 'Policy version, published registry, confidence floor'],
  ['02 Align', 'Bind the claim onto Member, Provider, and Claim'],
  ['03 Match', 'Run allow-listed operators against the payload'],
  ['04 Validate', 'Conflicts, coverage gaps, operator schema'],
  ['05 Govern', 'Draft and review cannot auto-apply'],
  ['06 Simulate', 'Dry-run the action before any artifact is eligible'],
  ['07 Ledger', 'Append the decision, the rule ids, and a checksum'],
] as const;

export default function RuleWeaverDiagram() {
  return (
    <figure className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-6 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <span className="font-mono text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
          Figure — Governed evaluation
        </span>
        <span className="rounded-full border border-neutral-300 px-2.5 py-0.5 font-mono text-[11px] text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
          claims-adjudication@1.4.2
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-mono text-xs font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
          [ Claim payload ]
        </div>
        <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
      </div>

      <div className="rounded-xl border border-neutral-300 bg-white p-5 dark:border-neutral-700/80 dark:bg-neutral-950">
        <div className="mb-5 text-center font-mono text-xs font-semibold tracking-widest text-neutral-600 dark:text-neutral-300">
          RULE REGISTRY
        </div>
        <div className="space-y-2">
          {stages.map(([label, detail]) => (
            <div
              key={label}
              className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-12 sm:items-center dark:border-neutral-800 dark:bg-neutral-900/70"
            >
              <div className="font-mono text-xs font-semibold text-neutral-800 sm:col-span-4 dark:text-neutral-100">
                {label}
              </div>
              <div className="text-xs text-neutral-600 sm:col-span-8 dark:text-neutral-300">{detail}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-neutral-200 pt-3 sm:grid-cols-3 dark:border-neutral-800">
          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
            <strong>Allow</strong> — published match, artifact eligible
          </div>
          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[11px] text-amber-900 dark:text-amber-200">
            <strong>Escalate</strong> — approval pending, no write
          </div>
          <div className="rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 font-mono text-[11px] text-rose-800 dark:text-rose-300">
            <strong>Deny</strong> — policy or schema, mutation blocked
          </div>
        </div>
      </div>

      <figcaption className="mt-3 text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Extraction, retrieval, and ontology mining sit upstream. They propose rules. This loop is what applies them.
      </figcaption>
    </figure>
  );
}
