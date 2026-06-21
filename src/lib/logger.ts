// Structured, machine-readable logging. Emits one JSON object per line so logs are
// parseable by tooling / AI agents instead of free-form prose. Dependency-free on
// purpose (see plan: "structured JSON logs"); swap the sink for pino later if needed.

import { isAppError } from "./errors";

type LogLevel = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

function emit(level: LogLevel, event: string, fields?: Fields): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Normalize an unknown thrown value into stable, serializable log fields. */
export function errorFields(err: unknown): Fields {
  if (isAppError(err)) return { errorCode: err.code, errorMessage: err.message };
  if (err instanceof Error) return { errorCode: "INTERNAL", errorMessage: err.message, errorName: err.name };
  return { errorCode: "INTERNAL", errorMessage: String(err) };
}

export const logger = {
  debug: (event: string, fields?: Fields) => emit("debug", event, fields),
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};
