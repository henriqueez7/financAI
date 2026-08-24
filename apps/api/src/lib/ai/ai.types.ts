import type { z } from "zod";

export interface AiProviderMetadata {
  provider: string;
  model: string;
}

export interface AiStructuredRequest<TSchema extends z.ZodType> {
  instructions: string;
  input: string;
  schema: TSchema;
  schemaName: string;
  maxOutputTokens?: number;
}

export interface AiProvider {
  readonly metadata: AiProviderMetadata;
  generateStructured<TSchema extends z.ZodType>(
    request: AiStructuredRequest<TSchema>,
  ): Promise<z.infer<TSchema>>;
}
