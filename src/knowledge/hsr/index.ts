import { FandomKnowledge } from '../base/types';
import { HSR_CHARACTERS } from './characters';
import { HSR_RELATIONSHIPS } from './relationships';
import { HSR_WORLD_RULES } from './world';
import { HSR_TROPES } from './tropes';

export const hsrKnowledge: FandomKnowledge = {
  fandomId: 'honkai-star-rail',
  displayName: '崩坏：星穹铁道',
  characters: HSR_CHARACTERS,
  relationships: HSR_RELATIONSHIPS,
  worldRules: HSR_WORLD_RULES,
  tropes: HSR_TROPES,
  toSystemPrompt(): string {
    const lines: string[] = [];

    lines.push(`【同人知识库：${this.displayName}】`);
    lines.push('');
    lines.push('以下是本次创作的角色设定与世界观参考资料，请严格遵守角色性格与世界规则。');
    lines.push('');

    // Characters section
    lines.push('【角色设定】');
    lines.push('');
    for (const char of this.characters) {
      const aliasStr = char.aliases.length > 0 ? `（${char.aliases.join(' / ')}）` : '';
      lines.push(`▎${char.name}${aliasStr}`);
      lines.push(`性格特征：${char.personality.join('；')}`);
      lines.push(`说话方式：${char.speechPatterns}`);
      lines.push(`情感触发点：${char.emotionalTriggers.join('、')}`);
      const relEntries = Object.entries(char.relationships);
      if (relEntries.length > 0) {
        lines.push(
          `人际关系：${relEntries.map(([name, desc]) => `${name}——${desc}`).join('；')}`
        );
      }
      const stateEntries = Object.entries(char.timelineStates);
      if (stateEntries.length > 0) {
        lines.push(
          `时间线状态：${stateEntries.map(([time, state]) => `[${time}] ${state}`).join('；')}`
        );
      }
      lines.push('');
    }

    // Relationships section
    lines.push('【热门CP与人物关系】');
    lines.push('');
    for (const rel of this.relationships) {
      lines.push(`▎${rel.characters.join(' × ')}（${rel.type}）`);
      lines.push(`关系描述：${rel.dynamic}`);
      lines.push(`关键时刻：${rel.keyMoments.join('；')}`);
      lines.push(`常见同人套路：${rel.commonFanficTropes.join('；')}`);
      lines.push('');
    }

    // World rules section
    lines.push('【世界观与规则】');
    lines.push('');
    for (const worldRule of this.worldRules) {
      lines.push(`▎${worldRule.category}`);
      for (const rule of worldRule.rules) {
        lines.push(`• ${rule}`);
      }
      lines.push('');
    }

    // Tropes section
    lines.push('【常用同人套路】');
    lines.push('');
    for (const trope of this.tropes) {
      lines.push(`▎${trope.name}`);
      lines.push(`说明：${trope.description}`);
      lines.push('角色适配：');
      for (const [charName, adaptation] of Object.entries(trope.characterAdaptations)) {
        lines.push(`  ${charName}：${adaptation}`);
      }
      lines.push('');
    }

    lines.push('【创作原则】');
    lines.push('');
    lines.push('• 角色发言和行为须符合上述性格设定，避免崩人（OOC）');
    lines.push('• 世界观细节须与崩坏：星穹铁道官方设定保持一致');
    lines.push('• 情感描写应细腻真实，避免刻意煽情或情感断层');
    lines.push('• 中文写作时注意语言风格与角色气质匹配');
    lines.push('• 涉及前世今生、命途等设定时需保持内在逻辑自洽');

    return lines.join('\n');
  },
};
