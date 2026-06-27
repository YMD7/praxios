export class PraxiosError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 404 | 409 | 500,
    message: string
  ) {
    super(message);
    this.name = "PraxiosError";
  }
}

export class NotFoundError extends PraxiosError {
  constructor(message: string) {
    super("not_found", 404, message);
  }
}

export class ConflictError extends PraxiosError {
  constructor(message: string, code = "conflict") {
    super(code, 409, message);
  }
}

export class InvalidProposalPayloadError extends PraxiosError {
  constructor(message: string) {
    super("invalid_proposal_payload", 409, message);
  }
}
