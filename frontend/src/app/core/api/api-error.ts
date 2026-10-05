import { HttpErrorResponse } from '@angular/common/http';
import { ApiFailure } from './api.types';

/** Codes the client produces itself when there is no API error body. */
export const CLIENT_ERROR = {
  network: 'NETWORK_ERROR',
  unknown: 'UNKNOWN_ERROR',
} as const;

export interface FieldError {
  field: string;
  message: string;
  /** Rule limit (e.g. minimum length), when the API sends it. */
  limit?: number;
}

/**
 * Normalised API failure. Branch on {@link code} (stable, listed in the backend's ERROR_CODES.md),
 * never on {@link message} — that is English text meant for developers.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof HttpErrorResponse) {
      const body = error.error as Partial<ApiFailure> | null;
      if (body && typeof body === 'object' && body.error?.code) {
        return new ApiError(error.status, body.error.code, body.error.message, body.error.details);
      }
      const code = error.status === 0 ? CLIENT_ERROR.network : CLIENT_ERROR.unknown;
      return new ApiError(error.status, code, error.message);
    }
    return new ApiError(0, CLIENT_ERROR.unknown, error instanceof Error ? error.message : String(error));
  }

  is(...codes: string[]): boolean {
    return codes.includes(this.code);
  }

  /** `VALIDATION_ERROR` details, ready to map onto form fields. */
  get fieldErrors(): FieldError[] {
    return this.code === 'VALIDATION_ERROR' && Array.isArray(this.details) ? (this.details as FieldError[]) : [];
  }

  /**
   * Minimum length of a text field that was too short, if that is why validation failed. Uses
   * `details[].limit` when the API sends it; otherwise reads it from the validator's message
   * ("… length must be at least 5 characters long").
   */
  get minLength(): number | null {
    for (const field of this.fieldErrors) {
      if (typeof field.limit === 'number') return field.limit;
      const match = /at least (\d+) characters/.exec(field.message ?? '');
      if (match) return Number(match[1]);
    }
    return null;
  }
}
