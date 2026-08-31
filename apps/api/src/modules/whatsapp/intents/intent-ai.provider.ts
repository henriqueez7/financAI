export interface IntentAiRequest {
  message: string;
  referenceDate: string;
}

export interface IntentAiProvider {
  interpret(request: IntentAiRequest): Promise<unknown>;
}
