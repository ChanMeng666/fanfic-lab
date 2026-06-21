// Typed, machine-stable error codes. Throw AppError(code) at the source; the UI
// boundary maps codes -> user-facing Chinese strings (see format-error.ts). This
// replaces fragile regex-matching of human-readable error message substrings.

export enum ErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION = "VALIDATION",
  RATE_LIMIT = "RATE_LIMIT",
  TIMEOUT = "TIMEOUT",
  NETWORK = "NETWORK",
  INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS",
  AGENT_FAILED = "AGENT_FAILED",
  INTERNAL = "INTERNAL",
}

// User-facing Chinese copy. The ONLY place codes become human text.
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: "请先登录后再操作",
  [ErrorCode.FORBIDDEN]: "无权限执行此操作",
  [ErrorCode.NOT_FOUND]: "资源不存在或已被移除",
  [ErrorCode.VALIDATION]: "输入有误，请检查后重试",
  [ErrorCode.RATE_LIMIT]: "操作过于频繁，请稍后再试",
  [ErrorCode.TIMEOUT]: "请求超时，请检查网络后重试",
  [ErrorCode.NETWORK]: "网络异常，请稍后重试",
  [ErrorCode.INSUFFICIENT_CREDITS]: "额度不足，请充值后再试",
  [ErrorCode.AGENT_FAILED]: "创作引擎出错，请稍后重试",
  [ErrorCode.INTERNAL]: "操作失败，请重试",
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;
  constructor(code: ErrorCode, message?: string, cause?: unknown) {
    super(message ?? code);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
