import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(fn, { prefix: "openclaw-ollama-api-" });
}

describe("models-config Ollama api defaulting", () => {
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env.HOME;
  });

  afterEach(() => {
    process.env.HOME = previousHome;
  });

  it("defaults api to 'openai-completions' for Ollama provider if not set", async () => {
    await withTempHome(async () => {
      vi.resetModules();
      const { ensureOpenClawModelsJson } = await import("./models-config.js");
      const { resolveOpenClawAgentDir } = await import("./agent-paths.js");

      // Explicit Ollama config without api field - this is what causes the bug
      const cfg: OpenClawConfig = {
        models: {
          providers: {
            ollama: {
              baseUrl: "http://ollama:11434",
              apiKey: "ollama",
              models: [
                {
                  id: "qwen3-coder",
                  name: "Qwen3 Coder (Local)",
                  reasoning: false,
                  input: ["text"],
                  contextWindow: 32000,
                  maxTokens: 4096,
                  cost: {
                    input: 0,
                    output: 0,
                    cacheRead: 0,
                    cacheWrite: 0,
                  },
                },
              ],
            },
          },
        },
      };

      await ensureOpenClawModelsJson(cfg);

      const modelPath = path.join(resolveOpenClawAgentDir(), "models.json");
      const raw = await fs.readFile(modelPath, "utf8");
      const parsed = JSON.parse(raw) as {
        providers: Record<string, { api?: string; models?: Array<{ id: string }> }>;
      };

      // The api field should be defaulted to "openai-completions"
      expect(parsed.providers.ollama?.api).toBe("openai-completions");
      expect(parsed.providers.ollama?.models?.[0]?.id).toBe("qwen3-coder");
    });
  });

  it("preserves explicit api if already set for Ollama provider", async () => {
    await withTempHome(async () => {
      vi.resetModules();
      const { ensureOpenClawModelsJson } = await import("./models-config.js");
      const { resolveOpenClawAgentDir } = await import("./agent-paths.js");

      // Explicit Ollama config with api field already set
      const cfg: OpenClawConfig = {
        models: {
          providers: {
            ollama: {
              baseUrl: "http://ollama:11434",
              apiKey: "ollama",
              api: "anthropic-messages", // Explicitly set to something else
              models: [
                {
                  id: "qwen3-coder",
                  name: "Qwen3 Coder (Local)",
                  reasoning: false,
                  input: ["text"],
                  contextWindow: 32000,
                  maxTokens: 4096,
                  cost: {
                    input: 0,
                    output: 0,
                    cacheRead: 0,
                    cacheWrite: 0,
                  },
                },
              ],
            },
          },
        },
      };

      await ensureOpenClawModelsJson(cfg);

      const modelPath = path.join(resolveOpenClawAgentDir(), "models.json");
      const raw = await fs.readFile(modelPath, "utf8");
      const parsed = JSON.parse(raw) as {
        providers: Record<string, { api?: string }>;
      };

      // The explicit api field should be preserved
      expect(parsed.providers.ollama?.api).toBe("anthropic-messages");
    });
  });
});
