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
  summary: z.string().describe("场景概要：这一幕发生了什么"),
  characters: z.array(z.string()).describe("出场角色"),
  emotion: z.string().describe("场景的情绪关键词"),
  hook: z.string().describe("开场钩子：用一个动作/画面/一句对话切入，不要从背景交代或心理总结开始"),
  turn: z.string().describe("这一幕结束时，人物关系或情绪发生了什么改变（没有任何变化的场景不该单独成幕）"),
  beatType: z
    .enum(["铺垫", "糖点", "刀点", "高潮", "转折", "收束", "日常"])
    .describe("这一幕在整体情感节拍中的作用"),
  sensoryAnchor: z.string().describe("贯穿本幕的一个核心感官意象（某种光线/气味/声音/触感/物件），让场景有质感"),
});

export const StoryOutlineSchema = z.object({
  title: z.string().describe("故事标题"),
  cp: z.array(z.string()),
  setting: z.string().describe("具体背景设定"),
  tone: z.string().describe("情感基调"),
  pov: z.string().describe("叙事人称与视角，如『第三人称限知·砂金视角』或『第一人称·星期日』"),
  themeLine: z.string().describe("一句话情感内核/主题，整篇围绕它收束"),
  beatTemplate: z.string().describe("采用的情感节拍模板名，如 虐转甜/破镜重圆/双向暗恋/HC/甜饼/悬疑/日常"),
  wordTarget: z.number().describe("目标字数：short=1500-2500, medium=3000-5000, long=5000-8000"),
  emotionalArc: z.string().describe("情感曲线描述（贴合所选节拍模板的起承转合）"),
  scenes: z.array(SceneSchema),
});
export type StoryOutlineResult = z.infer<typeof StoryOutlineSchema>;

export const OOCIssueSchema = z.object({
  character: z.string(),
  issue: z.string().describe("具体哪里不符合角色性格"),
  suggestion: z.string().describe("建议如何修改"),
  severity: z.enum(["low", "medium", "high"]),
});

export const QualityDimensionsSchema = z.object({
  characterFidelity: z.number().describe("角色还原度 / OOC 控制，1-10"),
  pacing: z.number().describe("节奏：张弛是否得当、有无拖沓或赶进度，1-10"),
  proseTexture: z.number().describe("文笔语感、是否有『AI味/翻译腔』，1-10"),
  emotionalPayoff: z.number().describe("情感是否到位、转折是否可信有铺垫，1-10"),
  dialogue: z.number().describe("对话是否鲜活、角色可区分、有潜台词/信息差，1-10"),
  immersion: z.number().describe("代入感与氛围营造，1-10"),
});

export const FlaggedSceneSchema = z.object({
  sceneIndex: z.number().describe("需要定向重写的场景序号（从 0 开始，对应大纲 scenes 顺序）"),
  problem: z.string().describe("这一幕最主要的问题"),
  fix: z.string().describe("具体应该怎么改"),
});

export const QualityReportSchema = z.object({
  overallScore: z.number().describe("综合评分 1-10"),
  dimensions: QualityDimensionsSchema,
  oocIssues: z.array(OOCIssueSchema),
  aiFlavorFlags: z.array(z.string()).describe("检测到的『AI味』句子或套路写法，原样摘录，便于针对性清除"),
  flaggedScenes: z.array(FlaggedSceneSchema).describe("达不到水准、需要定向重写的场景（只列真正有问题的，最多3个）"),
  proseNotes: z.array(z.string()).describe("整体文笔/节奏可改进的地方"),
  passesThreshold: z.boolean().describe("达到可发布到 Lofter 的水准时为 true（overallScore >= 8）"),
});
export type QualityReportResult = z.infer<typeof QualityReportSchema>;

export const DeliverySuggestionsSchema = z.object({
  suggestions: z.array(z.string()).describe("3 个类似推荐的故事创意"),
});
