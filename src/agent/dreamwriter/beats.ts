/**
 * Genre / tone beat templates — the structural skeletons behind Lofter-quality fic.
 *
 * A flat tone string ("虐转甜") carries no structure; but real 虐转甜 / 破镜重圆 /
 * 双向暗恋 fic each follow a KNOWN turning-point skeleton. The architect plans
 * against the matching skeleton so the outline has earned beats instead of a vague
 * 起承转合. This is a big part of what makes output feel like it "懂梗、懂节奏".
 *
 * Source material for the tropes themselves lives in src/knowledge/hsr/{tropes,
 * relationships}.ts; this file is the *structural* layer on top of that.
 */
export interface BeatTemplate {
  key: string;
  /** tone / genre strings (substring-matched) that route to this skeleton. */
  aliases: string[];
  label: string;
  /** ordered structural beats the story should hit. */
  beats: string[];
  /** craft note: the one thing that makes this genre land (or fall flat). */
  guidance: string;
}

export const BEAT_TEMPLATES: BeatTemplate[] = [
  {
    key: "angst-to-sweet",
    aliases: ["虐转甜", "先虐后甜", "破涕为笑"],
    label: "虐转甜",
    beats: [
      "甜蜜或亲密的日常，悄悄埋下隐患（误会、隐瞒、旧伤的种子）",
      "隐患发酵，矛盾爆发——刀点要扎在两人都最在乎的地方",
      "至暗时刻：各自煎熬、错过、或以为失去",
      "转机：真相浮现，或一方先放下骄傲低头",
      "双向奔赴，把前面欠的情债一笔笔还上",
      "HE 收束，留一点温柔的余韵",
    ],
    guidance: "核心是『虐有因、甜有据』：刀子要有来由，糖要还得起前面欠的债。突兀的和好等于廉价。",
  },
  {
    key: "reunion",
    aliases: ["破镜重圆", "重逢", "复合", "再续前缘"],
    label: "破镜重圆",
    beats: [
      "现状的裂痕：已分开 / 冷战 / 形同陌路，先让读者看见『碎』",
      "不得不重逢的契机",
      "穿插回溯，交代当年为什么碎（别一次倒完）",
      "克制的试探，旧习惯与新距离的拉扯",
      "一次破防或坦白，把没说出口的话摊开",
      "心结解开，重圆——是带着伤疤的圆满，不是当作无事发生",
    ],
    guidance: "重点是『为什么碎』和『凭什么圆』。圆得太轻，前面的痛就白受了。",
  },
  {
    key: "mutual-pining",
    aliases: ["双向暗恋", "双箭头", "互相暗恋", "暗恋"],
    label: "双向暗恋",
    beats: [
      "各自藏着心思的日常，谁都不肯先承认",
      "信息差制造张力：两人都误以为是单箭头",
      "一次靠近带来的悸动（一个动作、一次对视、一场雨）",
      "退缩与自我怀疑，把窗户纸又糊回去",
      "外部契机把人逼到必须表态",
      "戳破窗户纸，双向奔赴",
    ],
    guidance: "靠『读者全知、当事人不知』的反差喂糖。两人的小心思要让读者看得见、当事人看不见。",
  },
  {
    key: "hurt-comfort",
    aliases: ["HC", "hc", "Hurt", "Comfort", "治愈", "救赎"],
    label: "Hurt/Comfort",
    beats: [
      "建立伤口：身体的伤，或藏得更深的精神创伤",
      "痛苦的具体呈现（不是『他很痛苦』，是痛苦长什么样）",
      "comfort 一方的靠近，往往笨拙而克制",
      "落在具体动作上的照顾：一杯水、一件外套、一句不擅长的安慰",
      "信任与依赖在细节里一点点修复",
      "伤口结痂的温柔收束",
    ],
    guidance: "comfort 必须落在具体动作和细节上，空泛的安慰没有力量。先把『hurt』写得让人信，comfort 才有重量。",
  },
  {
    key: "fluff",
    aliases: ["甜饼", "豆花", "纯甜", "日常甜", "撒糖", "甜"],
    label: "甜饼/豆花",
    beats: [
      "没有大冲突，由几个生活切片组成",
      "一点小误会或小拌嘴当作调味",
      "轻巧化解",
      "在小事里升温的『小确幸』与心动",
    ],
    guidance: "靠细节密度和『小事里的心动』取胜。冲突要小、糖要密，把日常写出滤镜感。",
  },
  {
    key: "tragedy",
    aliases: ["虐", "BE", "be", "纯虐", "意难平", "悲剧"],
    label: "虐/BE",
    beats: [
      "美好的假象，越温柔越好",
      "裂痕显现，命运或性格的必然开始收网",
      "无法挽回的转折",
      "失去——或近在咫尺却永远错过",
      "余烬：一个意难平的收尾意象",
    ],
    guidance: "克制叙述，留白比直白更痛。最痛的往往不是哭喊，是平静里没说出口的那句话。",
  },
  {
    key: "suspense",
    aliases: ["悬疑", "推理", "惊悚", "解谜"],
    label: "悬疑",
    beats: [
      "抛出谜团或异常，第一时间钩住读者",
      "线索铺陈，夹杂误导",
      "张力升级，赌注变大",
      "关键反转",
      "真相揭晓",
      "情感落点：谜底最终照见的是人物关系",
    ],
    guidance: "谜底要服务于人物关系，别为悬疑而悬疑。读者解谜的快感和情感的揭示要同时到达。",
  },
  {
    key: "slice-of-life",
    aliases: ["日常", "平淡", "温馨"],
    label: "日常",
    beats: [
      "一个有起伏的小事件切入",
      "在事件里人物情绪的微妙变化",
      "一个余味悠长的收束",
    ],
    guidance: "日常不等于流水账。要有一个虽小但真实的情绪弧线，收在余味上。",
  },
];

const FALLBACK = BEAT_TEMPLATES.find((t) => t.key === "slice-of-life")!;

/** Pick the beat skeleton whose aliases best match the tone/genre string. */
export function selectBeatTemplate(tone: string, ending?: string): BeatTemplate {
  const t = (tone || "").trim();
  // BE ending overrides a "甜" tone read; honor an explicit tragic ending first.
  if (ending && /BE|be|悲/.test(ending)) {
    const tragedy = BEAT_TEMPLATES.find((b) => b.key === "tragedy");
    if (tragedy && !/转甜|HE/.test(t)) return tragedy;
  }
  // Longest alias match wins so "虐转甜" beats a bare "虐".
  let best: BeatTemplate | null = null;
  let bestLen = 0;
  for (const tpl of BEAT_TEMPLATES) {
    for (const a of tpl.aliases) {
      if (t.includes(a) && a.length > bestLen) {
        best = tpl;
        bestLen = a.length;
      }
    }
  }
  return best ?? FALLBACK;
}

/** Render a beat template into a planning instruction block for the architect. */
export function formatBeatGuidance(tpl: BeatTemplate): string {
  const beats = tpl.beats.map((b, i) => `  ${i + 1}. ${b}`).join("\n");
  return `## 情感节拍模板：${tpl.label}\n请让大纲的场景顺序贴合下面的节拍骨架（可合并或细分，但情感推进的逻辑要在）：\n${beats}\n\n【这一类型的关键】${tpl.guidance}`;
}
