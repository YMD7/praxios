export const APPLICATION_ERROR_CODES = [
  "invalid_workspace",
  "invalid_frontmatter",
  "missing_reference",
  "invalid_transition",
  "invalid_agent_output",
  "approval_required",
  "fixture_not_found",
  "lint_failed",
] as const;

export type ApplicationErrorCode = (typeof APPLICATION_ERROR_CODES)[number];

export interface ApplicationErrorDetails {
  readonly code: ApplicationErrorCode;
  readonly message: string;
  readonly target?: string;
  readonly cause?: unknown;
}

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly target?: string;
  override readonly cause?: unknown;

  constructor(details: ApplicationErrorDetails) {
    super(details.message, { cause: details.cause });
    this.name = "ApplicationError";
    this.code = details.code;
    this.target = details.target;
    this.cause = details.cause;
  }
}
