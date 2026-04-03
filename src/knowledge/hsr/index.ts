import { FandomKnowledge } from '../base/types';
import { HSR_CHARACTERS } from './characters';
import { HSR_RELATIONSHIPS } from './relationships';
import { HSR_WORLD_RULES } from './world';

// Common tropes and themes in HSR fandom
const HSR_TROPES = [
  {
    name: '前世今生',
    description: '角色跨越世界或时间维度的羁绊，如丹恒与饮月君、景元与云骑军的联系',
    characterAdaptations: {
      丹恒: '饮月君记忆觉醒、前后人生的撕裂与融合',
      景元: '云骑军统领的重压与对故人的等待',
      开拓者: '多世界间的共鸣，与各人命运的交织',
    },
  },
  {
    name: '救赎弧',
    description: '角色通过他人或旅途逐渐原谅自己、找到新生意义',
    characterAdaptations: {
      丹恒: '从自我审判走向接纳自己的两面性',
      布洛妮娅: '从被命运束缚走向选择自己的人生',
      星元: '作为治愈者本身也被治愈',
    },
  },
  {
    name: '秘密与揭示',
    description: '角色隐藏的身份、过去或能力逐渐浮出水面',
    characterAdaptations: {
      砂金: '珀内科尼的掌权者秘密、对黑天鹅的执念',
      丹恒: '饮月君身份的苏醒与他人的反应',
      藿藿: '身上封印的贊泽与天选者的身份',
    },
  },
  {
    name: '日常温暖',
    description: '在星穹列车上的日常互动、团队间的温馨时刻',
    characterAdaptations: {
      全员: '列车上的共餐、互相照顾、玩笑打闹的日常',
      布洛妮娅: '化学反应十足的伙伴互动',
      开拓者: '作为新人融入团队的过程',
    },
  },
];

export const hsrKnowledge: FandomKnowledge = {
  fandomId: 'hsr',
  displayName: '崩坏·星穹铁道',
  characters: HSR_CHARACTERS,
  relationships: HSR_RELATIONSHIPS,
  worldRules: HSR_WORLD_RULES,
  tropes: HSR_TROPES,
  toSystemPrompt(): string {
    const characterSummary = this.characters
      .map(
        (c) =>
          `## ${c.name}（别名：${c.aliases.join('、')}）\n` +
          `**性格特点**: ${c.personality.join('；')}\n` +
          `**说话方式**: ${c.speechPatterns}\n` +
          `**情感触发点**: ${c.emotionalTriggers.join('、')}\n` +
          `**重要关系**: ${Object.entries(c.relationships).map(([name, desc]) => `${name}（${desc}）`).join('；')}`
      )
      .join('\n\n');

    const relationshipSummary = this.relationships
      .map((r) => `### ${r.characters.join(' × ')}\n${r.dynamic}\n常见梗: ${r.commonFanficTropes.join('、')}`)
      .join('\n\n');

    const worldRulesSummary = this.worldRules.map((wr) => `**${wr.category}**: ${wr.rules.join('；')}`).join('\n\n');

    return `# 崩坏·星穹铁道 角色与剧情参考知识库

## 核心角色档案

${characterSummary}

## 重要关系与CP动态

${relationshipSummary}

## 世界观与创作规则

${worldRulesSummary}

## 常见创意梗与主题

${this.tropes.map((t) => `**${t.name}**: ${t.description}`).join('\n\n')}

## 创作指南

1. **角色还原是第一要务** - 确保每个角色的言行举止符合上述档案
2. **尊重角色背景** - 理解他们背负的秘密、伤痛与救赎之路
3. **梗的运用** - 常见梗都有深层逻辑，不可生硬拼凑
4. **AU设定的底线** - 改动设定时需保留角色内核特质
5. **情感真实性** - 角色间的互动需要符合他们的成长状态与心理`;
  },
};
