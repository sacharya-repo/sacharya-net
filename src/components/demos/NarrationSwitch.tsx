export function NarrationSwitch({
  enabled,
  speaking,
  supported,
  onChange,
}: {
  enabled: boolean;
  speaking: boolean;
  supported: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Narrate the run"
      aria-disabled={!supported}
      disabled={!supported}
      title={supported ? 'Read each stage aloud' : 'This browser has no speech voice'}
      onClick={() => onChange(!enabled)}
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a68456] disabled:cursor-not-allowed disabled:opacity-50 ${
        enabled
          ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950'
          : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          speaking ? 'animate-pulse bg-current' : enabled ? 'bg-current' : 'bg-neutral-300 dark:bg-neutral-600'
        }`}
      />
      {speaking ? 'Speaking' : 'Narration'}
    </button>
  );
}
