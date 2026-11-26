import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { site } from '../data/site';

export default function CopyEmail() {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(site.email);
      setState('copied');
    } catch {
      setState('error');
    }
    window.setTimeout(() => setState('idle'), 2000);
  }

  const label =
    state === 'copied' ? 'Copied!' : state === 'error' ? 'Copy failed' : `Copy ${site.email}`;

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="inline-flex h-11 items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 text-sm text-neutral-900 transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:border-neutral-500"
    >
      {state === 'copied' ? (
        <Check className="size-4 text-brass" strokeWidth={1.75} />
      ) : (
        <Copy className="size-4" strokeWidth={1.75} />
      )}
      {label}
    </button>
  );
}
