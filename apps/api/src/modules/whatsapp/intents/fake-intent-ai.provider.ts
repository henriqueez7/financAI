import type {
  IntentAiProvider,
  IntentAiRequest,
} from "./intent-ai.provider.js";

type FakeResponder =
  | unknown
  | ((request: IntentAiRequest) => unknown | Promise<unknown>);

export class FakeIntentAiProvider implements IntentAiProvider {
  readonly requests: IntentAiRequest[] = [];

  constructor(private readonly responder: FakeResponder) {}

  async interpret(request: IntentAiRequest) {
    this.requests.push(request);

    if (typeof this.responder === "function") {
      return this.responder(request);
    }

    return this.responder;
  }
}
