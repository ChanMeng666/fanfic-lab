import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type {
  StoryOutline,
  QualityReport,
  StoryResult,
  DreamWriterStage,
} from "../../lib/types/dreamwriter";

export const DreamWriterStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,

  stage: Annotation<DreamWriterStage>({
    reducer: (_, update) => update,
    default: () => "idle" as DreamWriterStage,
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
  ragContext: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
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
