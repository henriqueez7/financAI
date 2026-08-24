export class AiNotConfiguredError extends Error {
  constructor() {
    super("O recurso de IA ainda não foi configurado.");
    this.name = "AiNotConfiguredError";
  }
}

export class AiProviderTimeoutError extends Error {
  constructor() {
    super("A análise demorou mais do que o esperado.");
    this.name = "AiProviderTimeoutError";
  }
}

export class AiProviderRateLimitError extends Error {
  constructor() {
    super("O serviço de IA está temporariamente ocupado.");
    this.name = "AiProviderRateLimitError";
  }
}

export class AiProviderUnavailableError extends Error {
  constructor() {
    super("O serviço de IA está indisponível no momento.");
    this.name = "AiProviderUnavailableError";
  }
}

export class AiInvalidResponseError extends Error {
  constructor() {
    super("O serviço de IA retornou uma resposta inválida.");
    this.name = "AiInvalidResponseError";
  }
}
