export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly providerCause?: unknown,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export class AiValidationError extends Error {
  constructor(
    message: string,
    readonly schemaName: string,
    readonly rawOutput: unknown,
  ) {
    super(message);
    this.name = "AiValidationError";
  }
}

export class AiTimeoutError extends Error {
  constructor(message = "AI provider request timed out") {
    super(message);
    this.name = "AiTimeoutError";
  }
}
