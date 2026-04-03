import { FandomKnowledge } from '../base/types';
import { HSR_CHARACTERS } from './characters';
import { HSR_RELATIONSHIPS } from './relationships';
import { HSR_WORLD_RULES } from './world';
import { HSR_TROPES } from './tropes';

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
