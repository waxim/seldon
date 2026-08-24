/**
 * The one error envelope, defined once and thrown in every service.
 * Demerzel maps code → HTTP status at the edge; unknown exceptions become
 * `internal` with details stripped (docs/11-api.md).
 */
import { z } from "zod";

export const ERROR_CODES = [
  "unauthenticated",
  "forbidden",
  "not_found",
  "validation_failed",
  "dsl_error",
  "conflict",
  "unprocessable",
  "rate_limited",
  "payload_too_large",
  "upstream_error",
  "unavailable",
  "internal",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const HTTP_STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 400,
  dsl_error: 400,
  conflict: 409,
  unprocessable: 422,
  rate_limited: 429,
  payload_too_large: 413,
  upstream_error: 502,
  unavailable: 503,
  internal: 500,
};

export function httpStatusFor(code: ErrorCode): number {
  return HTTP_STATUS[code];
}

export type ErrorDetails = Record<string, unknown>;

export interface SeldonErrorBody {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
  requestId?: string;
}

export interface SeldonErrorEnvelope {
  error: SeldonErrorBody;
}

/**
 * Thrown everywhere. `toWire()` is what crosses an RPC boundary, so a
 * shard's `not_found` maps to 404 at the gateway, not 502.
 */
export class SeldonError extends Error {
  readonly code: ErrorCode;
  readonly details: ErrorDetails | undefined;
  readonly requestId: string | undefined;
  /** Marker so an error that has crossed an isolate hop is recognisable. */
  readonly isSeldonError = true as const;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      details?: ErrorDetails;
      requestId?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause === undefined ? {} : { cause: options.cause });
    this.name = "SeldonError";
    this.code = code;
    this.details = options.details;
    this.requestId = options.requestId;
  }

  get httpStatus(): number {
    return httpStatusFor(this.code);
  }

  toWire(requestId?: string): SeldonErrorEnvelope {
    const body: SeldonErrorBody = { code: this.code, message: this.message };
    if (this.details !== undefined) body.details = this.details;
    const id = requestId ?? this.requestId;
    if (id !== undefined) body.requestId = id;
    return { error: body };
  }

  /**
   * Recover a SeldonError from anything thrown — including a structured
   * clone that lost its prototype crossing a service binding.
   */
  static from(thrown: unknown): SeldonError {
    if (thrown instanceof SeldonError) return thrown;
    if (isWireShaped(thrown)) {
      const { code, message, details, requestId } = thrown as {
        code: ErrorCode;
        message: string;
        details?: ErrorDetails;
        requestId?: string;
      };
      return new SeldonError(code, message, {
        ...(details === undefined ? {} : { details }),
        ...(requestId === undefined ? {} : { requestId }),
      });
    }
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    return new SeldonError("internal", message, { cause: thrown });
  }
}

function isWireShaped(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { code?: unknown; message?: unknown };
  return (
    typeof candidate.message === "string" &&
    typeof candidate.code === "string" &&
    (ERROR_CODES as readonly string[]).includes(candidate.code)
  );
}

export const ErrorCodeSchema = z.enum(ERROR_CODES);

export const SeldonErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

/** Convenience constructors for the codes services throw most. */
export const errors = {
  notFound: (what: string, details?: ErrorDetails) =>
    new SeldonError("not_found", `${what} not found`, {
      ...(details ? { details } : {}),
    }),
  forbidden: (message = "role denies this action") =>
    new SeldonError("forbidden", message),
  unauthenticated: (message = "no valid Access identity") =>
    new SeldonError("unauthenticated", message),
  validationFailed: (message: string, details?: ErrorDetails) =>
    new SeldonError("validation_failed", message, {
      ...(details ? { details } : {}),
    }),
  unprocessable: (message: string, details?: ErrorDetails) =>
    new SeldonError("unprocessable", message, {
      ...(details ? { details } : {}),
    }),
  upstream: (service: string, cause?: unknown) =>
    new SeldonError("upstream_error", `${service} call failed`, { cause }),
  internal: (message: string, cause?: unknown) =>
    new SeldonError("internal", message, { cause }),
};
