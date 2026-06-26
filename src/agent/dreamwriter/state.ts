import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type {
  StoryOutline,
  QualityReport,
  StoryResult,
  DreamWriterStage,
  InputIntent,
} from "../../lib/types/dreamwriter";

export const DreamWriterStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,

  stage: Annotation<DreamWriterStage>({
    reducer: (_, update) => update,
    default: () => "idle" as DreamWriterStage,
  }),

  // Structured form input. When present (cp non-empty), the intent parser uses
  // it directly instead of inferring from free text. Null for pure free-text flow.
  inputIntent: Annotation<InputIntent | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // The length the user actually selected + paid for. Authoritative over any
  // length inferred from the prompt, so the selector truly controls wordTarget.
  requestedLength: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  parsedCP: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  parsedSetting: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  parsedTone: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  parsedConstraints: Annotation<Record<string, string>>({
    reducer: (_, update) => update,
    default: () => ({}),
  }),
  detectedLanguage: Annotation<"zh" | "en">({
    reducer: (_, update) => update,
    default: () => "zh" as const,
  }),

  outline: Annotation<StoryOutline | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  storyDraft: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  // Per-scene drafts (scene-by-scene writer). storyDraft is their assembly.
  sceneDrafts: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  // Rolling memo of what has happened + current emotional state, fed into each
  // subsequent scene so continuity holds without re-sending the whole draft.
  runningContext: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  // Final text after the polish / de-AI pass; falls back to storyDraft if skipped.
  polishedBody: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  ragContext: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  // Live fandom research brief (Tavily) for the requested CP; "" when unavailable.
  researchContext: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  qualityReport: Annotation<QualityReport | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  revisionCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  summary: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  result: Annotation<StoryResult | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  logs: Annotation<{ message: string; done: boolean }[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
});

export type DreamWriterState = typeof DreamWriterStateAnnotation.State;
