import React from 'react';

export default function ControlPlaneDiagram() {
  return (
    <figure className="my-10 rounded-xl border border-neutral-200 bg-neutral-50/80 p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-4 flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Figure 1 — Reference Architecture
        </span>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          Policy-Mediated Tool Gateway
        </span>
      </div>

      {/* Entry Node */}
      <div className="flex flex-col items-center">
        <div className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-mono text-xs font-medium text-neutral-800 shadow-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
          [ User / Triggering Event ]
        </div>
        <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
      </div>

      {/* Main Control Plane Box */}
      <div className="rounded-xl border border-neutral-300 bg-white p-5 dark:border-neutral-700/80 dark:bg-neutral-950">
        <div className="mb-5 text-center font-mono text-xs font-semibold tracking-widest text-neutral-600 dark:text-neutral-300">
          ENTERPRISE AGENT CONTROL PLANE
        </div>

        <div className="space-y-3">
          {/* Step 1 */}
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-12 sm:items-center dark:border-neutral-800 dark:bg-neutral-900/70">
            <div className="font-mono text-xs font-semibold text-sky-700 sm:col-span-4 dark:text-sky-400">
              1. IDENTITY
            </div>
            <div className="text-xs text-neutral-600 sm:col-span-8 dark:text-neutral-300">
              Bind short-lived, user-scoped token (no ambient service credentials)
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-12 sm:items-center dark:border-neutral-800 dark:bg-neutral-900/70">
            <div className="font-mono text-xs font-semibold text-sky-700 sm:col-span-4 dark:text-sky-400">
              2. ROUTE
            </div>
            <div className="text-xs text-neutral-600 sm:col-span-8 dark:text-neutral-300">
              Classify workflow intent &amp; mount bounded tool subset (3–5 tools)
            </div>
          </div>

          {/* Step 3 + Policy Outcomes */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/70">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
              <div className="font-mono text-xs font-semibold text-indigo-700 sm:col-span-4 dark:text-indigo-400">
                3. POLICY (OPA)
              </div>
              <div className="text-xs text-neutral-600 sm:col-span-8 dark:text-neutral-300">
                Evaluate ABAC rules, dollar thresholds &amp; entity ownership
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-neutral-200 pt-3 sm:grid-cols-3 dark:border-neutral-800">
              <div className="rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 font-mono text-[11px] text-rose-700 dark:text-rose-300">
                <strong>[ Deny ]</strong> → Structured refusal
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[11px] text-amber-800 dark:text-amber-300">
                <strong>[ Escalate ]</strong> → Human approval gate
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                <strong>[ Allow ]</strong> → Proceed to gateway
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-12 sm:items-center dark:border-neutral-800 dark:bg-neutral-900/70">
            <div className="font-mono text-xs font-semibold text-emerald-700 sm:col-span-4 dark:text-emerald-400">
              4. TOOL GATEWAY
            </div>
            <div className="text-xs text-neutral-600 sm:col-span-8 dark:text-neutral-300">
              Execute typed MCP call with least-privilege scope &amp; argument bounds
            </div>
          </div>

          {/* Step 5 */}
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-12 sm:items-center dark:border-neutral-800 dark:bg-neutral-900/70">
            <div className="font-mono text-xs font-semibold text-purple-700 sm:col-span-4 dark:text-purple-400">
              5. LEDGER
            </div>
            <div className="text-xs text-neutral-600 sm:col-span-8 dark:text-neutral-300">
              Append immutable causal audit record (identity, context, policy, result)
            </div>
          </div>
        </div>
      </div>

      <figcaption className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
        Five-stage runtime mediation loop separating probabilistic model reasoning from state-mutating MCP tools.
      </figcaption>
    </figure>
  );
}
