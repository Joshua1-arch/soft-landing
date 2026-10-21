import type { QlooAdapter } from "./types.ts";
import { MockQlooAdapter } from "./mock.ts";
import { LiveQlooAdapter } from "./live.ts";

let adapterInstance: QlooAdapter | null = null;

export function getQlooAdapter(): QlooAdapter {
  if (adapterInstance) return adapterInstance;

  const apiKey = process.env.QLOO_API_KEY;
  const mode = process.env.QLOO_MODE;

  if (!apiKey || mode === "mock") {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Qloo Adapter] Operating in MOCK mode (QLOO_API_KEY not set or QLOO_MODE=mock)");
    }
    adapterInstance = new MockQlooAdapter();
    return adapterInstance;
  }

  // When live adapter is configured with an API key
  try {
    adapterInstance = new LiveQlooAdapter();
  } catch (err) {
    console.warn("[Qloo Adapter] Live adapter unavailable, falling back to Mock:", err);
    adapterInstance = new MockQlooAdapter();
  }

  return adapterInstance;
}

export * from "./types.ts";
export * from "./fixtures/personas.ts";
