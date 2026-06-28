// Pure pricing constants + helpers. NOT a "use server" module, so these can be
// imported by both client components (to show costs) and server actions (to
// charge). Keeping them here avoids exporting non-async values from the
// "use server" credits module, which Next.js forbids.
//
// Credit unit: 1 credit ≈ 1000 words.

export const CREDIT_COSTS = {
  short: 1, // ~1000 words
  medium: 3, // ~3000 words
  long: 5, // ~6000 words
} as const;

export type StoryLength = keyof typeof CREDIT_COSTS;

/** Daily free-short allowance. */
export const FREE_DAILY_LIMIT = 3;

/** Continuations are billed per 1,000 delivered words. */
export const WORDS_PER_CREDIT = 1000;

/** Credits owed for a delivered piece, billed per 1k words (min 1). */
export function creditsForWords(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_CREDIT));
}

/**
 * Canonical length spec — the SINGLE source of truth for how long each tier is.
 * Both the UI labels (below) AND the DreamWriter architect read from here, so the
 * quoted length, the price, and what the agent actually writes stay in lock-step.
 * `maxScenes` caps the scene count (the tone beat-template alone doesn't scale with
 * length, which is what used to make a "short" balloon to multi-thousand words).
 */
export const LENGTH_SPECS: Record<
  StoryLength,
  { targetWords: number; maxScenes: number; approxZh: string }
> = {
  short: { targetWords: 1000, maxScenes: 2, approxZh: "约 1000 字" },
  medium: { targetWords: 3000, maxScenes: 4, approxZh: "约 3000 字" },
  long: { targetWords: 6000, maxScenes: 6, approxZh: "约 6000 字" },
};

/** UI metadata for each selectable story length (label + price; length from LENGTH_SPECS). */
export const LENGTH_OPTIONS: {
  value: StoryLength;
  labelZh: string;
  approxZh: string;
  cost: number;
}[] = [
  { value: "short", labelZh: "短篇", approxZh: LENGTH_SPECS.short.approxZh, cost: CREDIT_COSTS.short },
  { value: "medium", labelZh: "中篇", approxZh: LENGTH_SPECS.medium.approxZh, cost: CREDIT_COSTS.medium },
  { value: "long", labelZh: "长篇", approxZh: LENGTH_SPECS.long.approxZh, cost: CREDIT_COSTS.long },
];
