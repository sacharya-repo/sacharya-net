/**
 * Browser-voice narration for the demos.
 * Speech Synthesis only. No network, no recorded audio.
 */

const TOKEN_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/rw_[0-9a-f]{8,}/gi, 'the ledger hash'],
  [/dq_[0-9a-f]{8,}/gi, 'the ledger hash'],
  [/fp_[0-9a-f]{8,}/gi, 'the fingerprint'],
  [/profile-zz@w1/gi, 'profile Z Z, wave 1'],
  [/claims-adjudication@[\d.]+/gi, 'claims adjudication'],
  [/AUTH_MEDICAID/g, 'Medicaid'],
  [/H_IN_2/g, 'H in two'],
  [/H-IN-2/g, 'H in two'],
  [/H_ON/g, 'H on'],
  [/H-ON/g, 'H on'],
  [/H_IN/g, 'H in'],
  [/H-IN/g, 'H in'],
  [/TA_WARN/g, 'advisory warning'],
  [/QUARANTINE_ROWS/g, 'quarantine rows'],
  [/FILE_TO_BRONZE/g, 'file to bronze'],
  [/UNBALANCEABLE/g, 'unbalanceable'],
  [/PT48H/g, '48 hours'],
  [/PT24H/g, '24 hours'],
  [/PT1H/g, '1 hour'],
  [/ZZ-MCO-A/g, 'Z Z, M C O A'],
  [/ZZ-IE/g, 'Z Z, I E'],
  [/bronze\.eligibility_span/g, 'bronze eligibility span'],
  [/bronze\.encounter_header/g, 'bronze encounter header'],
  [/RULE_CLM_(\d+)/g, 'claim rule $1'],
  [/B-CMP-([A-Z0-9-]+)/g, 'completeness $1'],
  [/B-VAL-([A-Z0-9-]+)/g, 'validity $1'],
  [/B-REF-([A-Z0-9-]+)/g, 'referential $1'],
  [/B-UNQ-([A-Z0-9-]+)/g, 'uniqueness $1'],
  [/ABC-FILE-BRONZE/g, 'the file-to-bronze balance'],
  [/can_release/g, 'can release'],
  [/can_proceed/g, 'can proceed'],
  [/coverage_end/g, 'coverage end'],
  [/svc_date/g, 'service date'],
  [/member_key/g, 'member key'],
  [/member_status/g, 'member status'],
  [/network_status/g, 'network status'],
  [/program_code/g, 'program code'],
  [/billing_npi/g, 'billing N P I'],
  [/in_network/g, 'in network'],
  [/out_of_network/g, 'out of network'],
  [/block_unpublished/g, 'block unpublished'],
  [/confidence_floor/g, 'confidence floor'],
  [/auto_ceiling/g, 'auto ceiling'],
  [/hard_ceiling/g, 'hard ceiling'],
  [/raw_values/g, 'raw values'],
  [/(\d),(\d{3})\b/g, '$1$2'],
  [/\bL([1-4])\b/g, 'L $1'],
];

export function toSpeech(text: string): string {
  let spoken = text;
  for (const [pattern, replacement] of TOKEN_REPLACEMENTS) {
    spoken = spoken.replace(pattern, replacement);
  }
  spoken = spoken
    .replace(/[·•—–]/g, '. ')
    .replace(/→/g, '. ')
    .replace(/←/g, ', actual ')
    .replace(/->/g, ' to ')
    .replace(/@/g, ' at ')
    .replace(/[[\]]/g, ' ')
    .replace(/\n+/g, '. ')
    .replace(/[_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
  return spoken;
}

export function stageSpeech(
  label: string,
  stage: { executive: string; architect: string },
  view: 'executive' | 'architect',
): string {
  const body = view === 'executive' ? stage.executive : stage.architect;
  return toSpeech(`${label}. ${body}`);
}

export function canNarrate(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function voiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  if (!lang.startsWith('en')) return -1;
  let score = 1;
  if (lang === 'en-us') score += 4;
  else if (lang.startsWith('en')) score += 1;
  if (voice.localService) score += 1;
  if (/samantha|ava|allison|zoe|serena|karen|moira|daniel|aaron|nicky|google us english/.test(name)) {
    score += 6;
  }
  if (/compact|novelty|whisper|bells/.test(name)) score -= 4;
  return score;
}

function preferredVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = voiceScore(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

let generation = 0;

export function stopSpeaking(): void {
  generation += 1;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function speak(text: string, onDone: () => void): { cancel: () => void } {
  if (!canNarrate()) {
    onDone();
    return { cancel: () => undefined };
  }
  const mine = ++generation;
  const utterance = new SpeechSynthesisUtterance(toSpeech(text));
  utterance.lang = 'en-US';
  utterance.rate = 0.98;
  utterance.pitch = 1;
  const voice = preferredVoice();
  if (voice) {
    try {
      utterance.voice = voice;
    } catch {
      // A voice the engine will not accept falls back to the default.
    }
  }

  let settled = false;
  let safety = 0;
  const finish = () => {
    if (settled || mine !== generation) return;
    settled = true;
    window.clearTimeout(safety);
    onDone();
  };
  safety = window.setTimeout(finish, 15000);
  utterance.onend = finish;
  utterance.onerror = finish;

  const synth = window.speechSynthesis;
  synth.cancel();
  const timer = window.setTimeout(() => {
    if (settled || mine !== generation) return;
    const chosen = preferredVoice();
    if (chosen) {
      try {
        utterance.voice = chosen;
      } catch {
        // Keep the default voice.
      }
    }
    synth.resume();
    synth.speak(utterance);
  }, 60);

  return {
    cancel: () => {
      settled = true;
      generation += 1;
      window.clearTimeout(timer);
      window.clearTimeout(safety);
      synth.cancel();
    },
  };
}
