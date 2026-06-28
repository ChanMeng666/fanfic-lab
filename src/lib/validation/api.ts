// Central Zod schemas for API-route request bodies. Routes used to hand-parse
// and length-check bodies ad hoc; these schemas make validation consistent,
// cap every free-text field, and surface a typed AppError(VALIDATION) the UI
// boundary already knows how to render (see format-error.ts).

import { z } from "zod";
import { AppError, ErrorCode } from "@/lib/errors";
import { CREDIT_COSTS } from "@/lib/billing/pricing";

/** Parse `body` against `schema`, throwing AppError(VALIDATION) on failure. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.issues.map((i) => i.message).join("；") || "输入有误";
    throw new AppError(ErrorCode.VALIDATION, msg);
  }
  return r.data;
}

const lengthEnum = z.enum(
  Object.keys(CREDIT_COSTS) as [keyof typeof CREDIT_COSTS, ...(keyof typeof CREDIT_COSTS)[]],
);

// A short "what happens next" instruction shared by continue + branch flows.
const directionSchema = z
  .string()
  .trim()
  .min(5, "请描述续写的方向（至少 5 字）")
  .max(1000, "方向描述过长（≤ 1000 字）");

/** POST /api/create — free-text prompt OR structured form input (CP is enough). */
export const createBodySchema = z
  .object({
    prompt: z.string().max(4000, "灵感描述过长").optional(),
    length: lengthEnum.optional(),
    cp: z.array(z.string().max(40)).max(8).optional(),
    setting: z.string().max(40).optional(),
    tone: z.string().max(40).optional(),
    pov: z.string().max(40).optional(),
    ending: z.string().max(40).optional(),
    rating: z.string().max(8).optional(),
    avoid: z.array(z.string().max(40)).max(30).optional(),
    mustInclude: z.string().max(1000).optional(),
  })
  .refine((b) => Boolean(b.prompt?.trim()) || (b.cp?.some((c) => c.trim()) ?? false), {
    message: "请描述你想看的故事，或选择角色与基调",
  });

/** POST /api/stories — save a finished generation (server-authoritative content). */
export const saveStoryBodySchema = z.object({
  generationId: z.string().trim().min(1, "缺少生成记录标识"),
  remixedFromId: z.string().trim().min(1).optional(),
});

/** POST /api/stories/[id]/continue */
export const continueBodySchema = z.object({
  direction: directionSchema,
});

/** POST /api/stories/[id]/branches */
export const branchBodySchema = z.object({
  parentChapterId: z.string().trim().min(1, "缺少分叉点章节"),
  direction: directionSchema,
});
