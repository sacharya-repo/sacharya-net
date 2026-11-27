const stages = [
  ['01 Seal', 'Pin the batch, the registry digest, and the key epoch'],
  ['02 Bind', 'Accept the contract grain, the authority, and the partner'],
  ['03 Evaluate', 'Completeness, validity, uniqueness, and referential checks'],
  ['04 Balance', 'Reconcile the hop. A residual raises the floor'],
  ['05 Mode', 'Policy, floor, and the autonomy ceiling. The strictest wins'],
  ['06 Propose', 'A closed verb and a dry-run. Landed rows stay as they were'],
  ['07 Release', 'can_release, then one manifest version and a pointer flip'],
] as const;

export default function DqControlDiagram() {
  return (
    <figure className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-6 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <span className="font-mono text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
          Figure — Data-quality gate
        </span>
        <span className="rounded-full border border-neutral-300 px-2.5 py-0.5 font-mono text-[11px] text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
          profile-zz@w1
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-mono text-xs font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
          [ Batch counts ]
        </div>
        <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
      </div>

      <div className="rounded-xl border border-neutral-300 bg-white p-5 dark:border-neutral-700/80 dark:bg-neutral-950">
        <div className="mb-5 text-center font-mono text-xs font-semibold tracking-widest text-neutral-600 dark:text-neutral-300">
          CONTROL PLANE
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
            <strong>Promote</strong> — mode A, pointer may advance
          </div>
          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[11px] text-amber-900 dark:text-amber-200">
            <strong>Quarantine</strong> — severable rows, one steward
          </div>
          <div className="rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 font-mono text-[11px] text-rose-800 dark:text-rose-300">
            <strong>Reject / Block</strong> — unit held, or hop open
          </div>
        </div>
      </div>

      <figcaption className="mt-3 text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Checks run in the data plane. The control plane keeps counts, tokens, and the decision. A model may comment. The mode function reads policy, floor, and tier.
      </figcaption>
    </figure>
  );
}
