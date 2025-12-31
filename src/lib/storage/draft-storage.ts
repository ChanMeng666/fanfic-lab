"use client";

export interface DraftData {
  id: string;
  title: string;
  content: string;
  fandom: string;
  ships: string[];
  tags: string[];
  tone: string;
  characters: {
    id: string;
    name: string;
    fandom: string;
    personality: string[];
    speechPattern?: string;
    isOriginal?: boolean;
  }[];
  updatedAt: string;
  createdAt: string;
}

const DRAFTS_KEY = "fanfic-lab-drafts";

export function saveDraft(draft: DraftData): void {
  if (typeof window === "undefined") return;

  const drafts = getAllDrafts();
  const existingIndex = drafts.findIndex((d) => d.id === draft.id);

  if (existingIndex >= 0) {
    drafts[existingIndex] = { ...draft, updatedAt: new Date().toISOString() };
  } else {
    drafts.push({
      ...draft,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function getDraft(id: string): DraftData | null {
  if (typeof window === "undefined") return null;

  const drafts = getAllDrafts();
  return drafts.find((d) => d.id === id) || null;
}

export function getAllDrafts(): DraftData[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(DRAFTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function deleteDraft(id: string): void {
  if (typeof window === "undefined") return;

  const drafts = getAllDrafts().filter((d) => d.id !== id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
