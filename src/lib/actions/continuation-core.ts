// Shared continuation engine. Both the author-only chapter continuation
// (src/app/api/stories/[id]/continue/route.ts) and the community branch
// 续写 (src/app/api/stories/[id]/branches/route.ts) need the SAME single
// writer call against prior-chapter context — there is no outline / quality /
// revision loop here (that lives in the full DreamWriter graph). Extracting it
// keeps the two routes in lock-step and avoids duplicating the prompt design.
//
// NOTE: plain module, NOT "use server" — it's imported by route handlers, not
// invoked as a server action.

import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { countWords } from "@/lib/wordcount";
import { writerModel, polishModel, utilityModel } from "@/agent/dreamwriter/models";
import { logger, errorFields } from "@/lib/logger";

const CONTINUE_PROMPT = `你是一位顶尖的同人文作者，正在为一篇连载中的同人文写新的一章。读者已经读完前面所有章节，你需要根据指示，自然衔接地写出下一章。

写作要求：
1. 【角色一致】严格保持已有章节中的角色性格、说话方式与行为习惯
2. 【自然衔接】读完上一章末尾的那位读者，应该能无缝接到这一章的开头，不要总结上一章发生了什么
3. 【独立张力】这一章本身要有起承转合，不要写成「过场」
4. 【篇幅】2000~4000 字
5. 【风格统一】文笔、节奏、氛围与已有章节保持一致

输出要求：直接输出本章正文，不要加章节标题、不要加作者注、不要加任何元信息。`;

const CHAPTER_TITLE_PROMPT = `请为以下同人文章节拟一个简洁的中文章节标题。

要求：
1. 4~10 字
2. 有诗意，能引发读者兴趣
3. 不要剧透关键转折
4. 不要带「第 X 章」字样，不要引号
5. 直接输出标题，不要任何前缀或额外文字

只输出标题本身。`;

// Light language-only polish for a freshly written continuation chapter. Mirrors
// the graph's polish node but as a single pass — de-AI-flavor + voice consistency,
// no plot/setting changes. Continuation is no longer a single raw call.
const CONTINUATION_POLISH_PROMPT = `你是一位资深文学编辑，正在为一篇连载同人文的新章节做最后润色。只做语言层面的优化，不改情节、不改设定、不增删人物或对白内容：
1. 去除 AI 腔：套路化比喻、空泛抒情、"仿佛/一丝/不禁/微微"等高频虚词堆砌
2. 统一叙事人称与语气，保持与连载前文一致的文笔与节奏
3. 让对白更贴合角色、画面更具体可感
直接输出润色后的完整正文，不要加任何说明、标题或元信息。`;

export interface ContinuationStory {
  title: string;
  summary: string | null;
  fandom: string;
  ships: string[];
  tags: string[];
}

export interface ContinuationChapter {
  title: string | null;
  content: string;
  wordCount: number;
}

export interface ContinuationContext {
  story: ContinuationStory;
  /** Lineage from the story root down to the fork point, in order. */
  priorChapters: ContinuationChapter[];
  /** The reader's / author's "what happens next" instruction. */
  direction: string;
  /** Used only to phrase the prompt ("写出第 N 章"). */
  nextChapterNumber: number;
}

export interface ContinuationResult {
  content: string;
  title: string | null;
  wordCount: number;
}

/** SSE-style event sink, shared by both routes. */
export type SendFn = (event: object) => void;

/**
 * Generate a chapter-style title for a piece of content. Returns null on any
 * failure or out-of-range output — callers should treat a null title as "no
 * title" rather than an error.
 */
export async function generateChapterTitle(content: string): Promise<string | null> {
  try {
    const model = utilityModel({ temperature: 0.6, maxTokens: 30 });
    const res = await model.invoke([
      new SystemMessage(CHAPTER_TITLE_PROMPT),
      new HumanMessage(content.slice(0, 3000)),
    ]);
    const raw = (typeof res.content === "string" ? res.content : "").trim();
    const cleaned = raw
      .replace(/^["「『《]|["」』》]$/g, "")
      .replace(/^第.{1,4}章[：:]?\s*/, "")
      .trim();
    if (cleaned.length < 2 || cleaned.length > 20) return null;
    return cleaned;
  } catch (e) {
    logger.warn("continuation.title.failed", errorFields(e));
    return null;
  }
}

/**
 * Run the single writer call that produces a continuation. Streams `writing`
 * and `titling` stages through `send`. Throws an Error (message in Chinese) if
 * the model returns suspiciously short content — the caller decides how to
 * surface that (e.g. an SSE `error` stage).
 *
 * It does NOT persist anything or charge credits — persistence differs between
 * the canonical chapter route (writes a Chapter) and the branch route (writes
 * a StoryBranch), so the caller owns it.
 */
export async function generateContinuation(
  ctx: ContinuationContext,
  send: SendFn
): Promise<ContinuationResult> {
  const { story, priorChapters, direction, nextChapterNumber } = ctx;

  // Context summarization strategy: short previews of every prior chapter,
  // plus the full tail (~2000 chars) of the most recent one for continuity.
  // Keeps the prompt under ~6k tokens for typical stories.
  const priorPreviews = priorChapters
    .map((c, i) => {
      const head = c.content.slice(0, 200).trim();
      const titlePart = c.title ? `「${c.title}」` : "";
      return `第${i + 1}章${titlePart}（${c.wordCount} 字）：${head}…`;
    })
    .join("\n");

  const lastChapter = priorChapters[priorChapters.length - 1];
  const lastChapterTail = lastChapter ? lastChapter.content.slice(-2000).trim() : "";

  const userMsg = `【故事标题】${story.title}
${story.summary ? `【作品简介】${story.summary}\n` : ""}【作品】${story.fandom}
【CP】${story.ships.join("、") || "无"}
【标签】${story.tags.join("、") || "无"}

【已有章节预览】
${priorPreviews || "（暂无）"}

${lastChapterTail ? `【最近一章末尾约 2000 字，用于衔接】\n${lastChapterTail}\n` : ""}
【指定的本章方向】
${direction}

请基于以上信息，写出第 ${nextChapterNumber} 章的完整正文。`;

  send({ stage: "writing", message: `正在续写第 ${nextChapterNumber} 章…` });

  // Continuity-first write on the same writer tier as initial creation (gpt-5.4
  // via the factory, with the repo's timeout/retry policy) — no longer a legacy
  // gpt-4o one-off.
  const response = await writerModel().invoke([
    new SystemMessage(CONTINUE_PROMPT),
    new HumanMessage(userMsg),
  ]);
  const content = (
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content)
  ).trim();

  if (content.length < 200) {
    throw new Error("生成的章节过短，请重试或调整描述");
  }

  // Light language-only polish pass (mode-specific continuation pipeline). Falls
  // back to the raw draft on failure or if the pass over-trims (< 60% length),
  // so polish can never lose or truncate the chapter.
  send({ stage: "polishing", message: "正在润色本章…" });
  let polished = content;
  try {
    const presp = await polishModel().invoke([
      new SystemMessage(CONTINUATION_POLISH_PROMPT),
      new HumanMessage(content),
    ]);
    const out = (typeof presp.content === "string" ? presp.content : "").trim();
    if (out.length >= content.length * 0.6) polished = out;
  } catch (e) {
    logger.warn("continuation.polish.failed", errorFields(e));
  }

  send({ stage: "titling", message: "正在为本章拟标题…" });
  const title = await generateChapterTitle(polished);

  return { content: polished, title, wordCount: countWords(polished) };
}
