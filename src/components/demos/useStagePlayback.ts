import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { canNarrate, speak, stageSpeech, stopSpeaking } from './narration';

type NarratedStage = { executive: string; architect: string };

export function useStagePlayback({
  narration,
  trace,
  labels,
  activeIndex,
  setActiveIndex,
  tokenRef,
  view,
  verdict,
}: {
  narration: boolean;
  trace: { stages: NarratedStage[] } | null;
  labels: readonly { label: string }[];
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  tokenRef: MutableRefObject<number>;
  view: 'executive' | 'architect';
  verdict: string;
}): { speaking: boolean } {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (!trace || activeIndex < 0) return;
    const token = tokenRef.current;
    const count = trace.stages.length;

    const advance = () => {
      if (tokenRef.current !== token) return;
      setActiveIndex((current) => current + 1);
    };

    if (!narration || !canNarrate()) {
      setSpeaking(false);
      if (activeIndex >= count) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setActiveIndex(count);
        return;
      }
      const timer = window.setTimeout(advance, 420);
      return () => window.clearTimeout(timer);
    }

    if (activeIndex > count) {
      setSpeaking(false);
      return;
    }

    const line =
      activeIndex === count
        ? verdict
        : stageSpeech(labels[activeIndex]?.label ?? 'Stage', trace.stages[activeIndex], view);

    setSpeaking(true);
    const handle = speak(line, () => {
      if (tokenRef.current !== token) return;
      setSpeaking(false);
      advance();
    });
    return () => {
      handle.cancel();
      setSpeaking(false);
    };
  }, [narration, trace, activeIndex, view, verdict, labels, setActiveIndex, tokenRef]);

  return { speaking };
}
