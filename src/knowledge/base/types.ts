export interface CharacterProfile {
  name: string;
  aliases: string[];
  personality: string[];
  speechPatterns: string;
  emotionalTriggers: string[];
  relationships: Record<string, string>;
  timelineStates: Record<string, string>;
}

export interface RelationshipDynamic {
  characters: [string, string];
  type: string;
  dynamic: string;
  keyMoments: string[];
  commonFanficTropes: string[];
}

export interface WorldRule {
  category: string;
  rules: string[];
}

export interface TropeTemplate {
  name: string;
  description: string;
  characterAdaptations: Record<string, string>;
}

export interface FandomKnowledge {
  fandomId: string;
  displayName: string;
  characters: CharacterProfile[];
  relationships: RelationshipDynamic[];
  worldRules: WorldRule[];
  tropes: TropeTemplate[];
  toSystemPrompt(): string;
}
