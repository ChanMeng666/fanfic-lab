import { isAppError, ERROR_MESSAGES } from "./errors";

type ErrorRule = { match: RegExp; message: string };

const RULES: ErrorRule[] = [
  { match: /unauthori[sz]ed|未登录|sign[\s-]?in|not authenticated/i, message: "请先登录后再操作" },
  { match: /forbidden|无权限|permission denied|not allowed/i, message: "无权限执行此操作" },
  { match: /not\s?found|不存在|404/i, message: "资源不存在或已被移除" },
  { match: /rate\s?limit|too many|过于频繁|spam/i, message: "操作过于频繁，请稍后再试" },
  { match: /timeout|timed?\s?out/i, message: "请求超时，请检查网络后重试" },
  { match: /network|fetch failed|connection refused/i, message: "网络异常，请稍后重试" },
];

/**
 * Map server / network errors to user-facing Chinese messages.
 *
 * Behaviour:
 *  - If `err` is an AppError, map its typed `code` to the canonical message
 *    (the preferred path — machine-stable, no string matching).
 *  - Else if `err` matches any known regex rule (for third-party / unknown
 *    errors), return the mapped Chinese message.
 *  - Else if `err` is an Error with a non-empty message, surface it verbatim
 *    (server actions often throw Chinese, e.g. "标题不能为空").
 *  - Otherwise fall back to `fallback` (default: 「操作失败，请重试」).
 */
export function formatError(err: unknown, fallback = "操作失败，请重试"): string {
  if (!err) return fallback;
  if (isAppError(err)) return ERROR_MESSAGES[err.code];
  const raw = err instanceof Error ? err.message : String(err);
  if (!raw) return fallback;
  for (const rule of RULES) {
    if (rule.match.test(raw)) return rule.message;
  }
  return raw;
}
