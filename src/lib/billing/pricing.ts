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

/** UI metadata for each selectable story length. */
export const LENGTH_OPTIONS: {
  value: StoryLength;
  labelZh: string;
  approxZh: string;
  cost: number;
}[] = [
  { value: "short", labelZh: "短篇", approxZh: "约 1000 字", cost: CREDIT_COSTS.short },
  { value: "medium", labelZh: "中篇", approxZh: "约 3000 字", cost: CREDIT_COSTS.medium },
  { value: "long", labelZh: "长篇", approxZh: "约 6000 字", cost: CREDIT_COSTS.long },
];
