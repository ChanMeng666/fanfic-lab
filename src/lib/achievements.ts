// Achievement catalog. Definitions live in code (keyed by `key`); the
// UserAchievement table only records who earned what. Icons are Lucide names
// resolved in the UI (no emoji per design rules).

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  /** Lucide icon name resolved by the profile UI. */
  icon: "Feather" | "PenLine" | "Heart" | "Flame" | "GitBranch" | "Trophy";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_story", title: "初次启程", description: "发布了第一篇作品", icon: "Feather" },
  { key: "prolific_5", title: "笔耕不辍", description: "累计发布 5 篇作品", icon: "PenLine" },
  { key: "liked_100", title: "广受好评", description: "作品累计获得 100 个赞", icon: "Heart" },
  { key: "streak_7", title: "七日不辍", description: "连续 7 天创作打卡", icon: "Flame" },
  {
    key: "branch_adopted",
    title: "续写有功",
    description: "你的续写分支被作者采纳为正章",
    icon: "GitBranch",
  },
];

export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.key, a])
);
