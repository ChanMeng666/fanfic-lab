import { z } from "zod";

// Zod schemas used with ChatOpenAI.withStructuredOutput(...) so the model is forced to
// return schema-valid JSON. This replaces the old hand-rolled parseJsonSafe() + silent
// degraded fallbacks, making the pipeline deterministic and machine-checkable.

export const IntentSchema = z.object({
  cp: z.array(z.string()).describe("角色配对，如 ['角色A', '角色B']"),
  setting: z.string().describe("背景设定（原著/现代AU/校园AU/IF线等）"),
  tone: z.string().describe("情感基调（甜/虐/虐转甜/日常/悬疑等）"),
  constraints: z.object({
    ending: z.string().describe("HE/BE/OE，默认 HE"),
    rating: z.string().describe("G/T/M，默认 T"),
    length: z.string().describe("short/medium/long，默认 medium"),
    specificRequests: z.string().describe("用户的其他具体要求，没有则空字符串"),
  }),
  language: z.enum(["zh", "en"]).describe("根据用户输入语言判断"),
});
export type IntentResult = z.infer<typeof IntentSchema>;

export const SceneSchema = z.object({
  summary: z.string().describe("场景概要"),
  characters: z.array(z.string()).describe("出场角色"),
  emotion: z.string().describe("场景的情绪关键词"),
});

export const StoryOutlineSchema = z.object({
  title: z.string().describe("故事标题"),
  cp: z.array(z.string()),
  setting: z.string().describe("具体背景设定"),
  tone: z.string().describe("情感基调"),
  wordTarget: z.number().describe("目标字数：short=1500-2500, medium=3000-5000, long=5000-8000"),
  emotionalArc: z.string().describe("情感曲线描述（起承转合）"),
  scenes: z.array(SceneSchema),
});
export type StoryOutlineResult = z.infer<typeof StoryOutlineSchema>;

export const OOCIssueSchema = z.object({
  character: z.string(),
  issue: z.string().describe("具体哪里不符合角色性格"),
  suggestion: z.string().describe("建议如何修改"),
  severity: z.enum(["low", "medium", "high"]),
});

export const QualityReportSchema = z.object({
  overallScore: z.number().describe("1-10 综合评分"),
  oocIssues: z.array(OOCIssueSchema),
  consistencyIssues: z.array(z.string()).describe("剧情逻辑问题"),
  proseNotes: z.array(z.string()).describe("文笔可以改进的地方"),
  passesThreshold: z.boolean().describe("overallScore >= 7 时为 true"),
});
export type QualityReportResult = z.infer<typeof QualityReportSchema>;

export const DeliverySuggestionsSchema = z.object({
  suggestions: z.array(z.string()).describe("3 个类似推荐的故事创意"),
});
