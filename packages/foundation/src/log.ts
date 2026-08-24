/**
 * The one structured JSON logger, feeding Workers Logs
 * (docs/12-deployment.md). Every line carries the service and the request
 * id Demerzel stamps, so gateway audit rows and per-service logs
 * correlate.
 */
import type { ServiceName } from "./services.js";

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LogFields {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** A child logger carrying extra fields — typically a request id. */
  with(fields: LogFields): Logger;
}

export interface LoggerOptions {
  service: ServiceName;
  environment: string;
  level?: LogLevel;
  fields?: LogFields;
  /** Injectable sink, so tests can assert on lines instead of stdout. */
  sink?: (line: string) => void;
}

export function createLogger(options: LoggerOptions): Logger {
  const level = options.level ?? "info";
  const sink = options.sink ?? ((line: string) => console.log(line));
  const base: LogFields = {
    service: options.service,
    environment: options.environment,
    ...options.fields,
  };

  const emit = (severity: LogLevel, message: string, fields?: LogFields) => {
    if (SEVERITY[severity] < SEVERITY[level]) return;
    sink(
      JSON.stringify({
        level: severity,
        message,
        ...base,
        ...fields,
      }),
    );
  };

  return {
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
    with: (fields) =>
      createLogger({
        ...options,
        fields: { ...options.fields, ...fields },
      }),
  };
}
