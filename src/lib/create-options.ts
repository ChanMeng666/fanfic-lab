// Client-safe option lists for the structured creation form. Pure constants (no
// server deps) so they can be imported by client components. The character list
// is curated for the picker; CP is free-form to the agent, so anything not here
// can still be typed into 灵感补充.

/** Popular HSR characters for the CP picker. */
export const HSR_CHARACTER_OPTIONS = [
  "砂金", "星期日", "丹恒", "景元", "三月七", "星", "穹", "知更鸟",
  "黄泉", "花火", "银狼", "卡芙卡", "藿藿", "镜流", "刃", "黑天鹅",
  "帝皇", "阮·梅", "瓦尔特", "符玄", "停云", "罗刹",
] as const;

/** Tone/genre → drives the beat template (values match beats.ts aliases). */
export const TONE_OPTIONS: { value: string; label: string }[] = [
  { value: "甜饼", label: "甜饼 / 日常甜" },
  { value: "虐转甜", label: "虐转甜" },
  { value: "破镜重圆", label: "破镜重圆" },
  { value: "双向暗恋", label: "双向暗恋" },
  { value: "HC", label: "HC 治愈" },
  { value: "虐", label: "纯虐" },
  { value: "悬疑", label: "悬疑" },
  { value: "日常", label: "日常" },
  { value: "BE", label: "BE / 意难平" },
];

/** Background / AU setting. */
export const SETTING_OPTIONS = [
  "原著向", "现代AU", "校园AU", "ABO", "IF线", "古风AU", "娱乐圈AU",
] as const;

/** Narrative POV. "自动" lets the architect decide. */
export const POV_OPTIONS = [
  "自动", "第一人称", "第三人称限知", "第三人称全知",
] as const;

/** Content rating (G/T/M) → mapped to the Prisma enum on save. */
export const RATING_OPTIONS: { value: string; label: string }[] = [
  { value: "G", label: "全年龄" },
  { value: "T", label: "青少年" },
  { value: "M", label: "成人向" },
];

/** Ending. "不限" leaves it to the story/tone. */
export const ENDING_OPTIONS = ["不限", "HE", "BE", "OE"] as const;

/** Structured form payload passed from the form up to the creation flow. */
export interface StructuredCreateInput {
  cp?: string[];
  tone?: string;
  setting?: string;
  pov?: string;
  rating?: string;
  ending?: string;
  avoid?: string[];
  mustInclude?: string;
}
