import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(fn, { prefix: "openclaw-ollama-api-" });
}

describe("models-config Ollama normalization", () => {
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env.HOME;
  });

  afterEach(() => {
    process.env.HOME = previousHome;
  });

  it("defaults api to 'openai-completions' and appends /v1 to baseUrl for Ollama provider", async () => {
    await withTempHome(async () => {
      vi.resetModules();
      const { ensureOpenClawModelsJson } = await import("./models-config.js");
      const { resolveOpenClawAgentDir } = await import("./agent-paths.js");

      // Explicit Ollama config without api field and without /v1 suffix
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
        providers: Record<
          string,
          { api?: string; baseUrl?: string; models?: Array<{ id: string }> }
        >;
      };

      // The api field should be defaulted to "openai-completions"
      expect(parsed.providers.ollama?.api).toBe("openai-completions");
      // The baseUrl should have /v1 appended
      expect(parsed.providers.ollama?.baseUrl).toBe("http://ollama:11434/v1");
      expect(parsed.providers.ollama?.models?.[0]?.id).toBe("qwen3-coder");
    });
  });

  it("preserves baseUrl when it already ends with /v1", async () => {
    await withTempHome(async () => {
      vi.resetModules();
      const { ensureOpenClawModelsJson } = await import("./models-config.js");
      const { resolveOpenClawAgentDir } = await import("./agent-paths.js");

      // Explicit Ollama config with /v1 already present
      const cfg: OpenClawConfig = {
        models: {
          providers: {
            ollama: {
              baseUrl: "http://ollama:11434/v1",
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
        providers: Record<string, { baseUrl?: string }>;
      };

      // The baseUrl should remain unchanged
      expect(parsed.providers.ollama?.baseUrl).toBe("http://ollama:11434/v1");
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

  it("handles baseUrl with trailing slash", async () => {
    await withTempHome(async () => {
      vi.resetModules();
      const { ensureOpenClawModelsJson } = await import("./models-config.js");
      const { resolveOpenClawAgentDir } = await import("./agent-paths.js");

      // Explicit Ollama config with trailing slash but no /v1
      const cfg: OpenClawConfig = {
        models: {
          providers: {
            ollama: {
              baseUrl: "http://ollama:11434/",
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
        providers: Record<string, { baseUrl?: string }>;
      };

      // The baseUrl should have v1 appended without double slash
      expect(parsed.providers.ollama?.baseUrl).toBe("http://ollama:11434/v1");
    });
  });

  it("preserves baseUrl when it already ends with /v1/", async () => {
    await withTempHome(async () => {
      vi.resetModules();
      const { ensureOpenClawModelsJson } = await import("./models-config.js");
      const { resolveOpenClawAgentDir } = await import("./agent-paths.js");

      // Explicit Ollama config with /v1/ already present
      const cfg: OpenClawConfig = {
        models: {
          providers: {
            ollama: {
              baseUrl: "http://ollama:11434/v1/",
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
        providers: Record<string, { baseUrl?: string }>;
      };

      // The baseUrl should remain unchanged
      expect(parsed.providers.ollama?.baseUrl).toBe("http://ollama:11434/v1/");
    });
  });
});
