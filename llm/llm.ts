/**
 * LLM access for the IA reviser.
 *
 * `https://api.cursor.com` is not a chat endpoint. When LLM_API_ENDPOINT points
 * there, the call goes through the Cursor SDK as a text-only local agent
 * (no tools, empty working directory). Any other endpoint is treated as an
 * Anthropic Messages-compatible API.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const TIMEOUT_MS = 180_000;
const MAX_OUTPUT_TOKENS = 8192;
const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5-5";

/**
 * Sonnet 5.5 thinks unless told otherwise, and it rejects `thinking: disabled`.
 * `between_tools` skips that up-front pass when the request offers no tools.
 * Sonnet 5 accepts `disabled`. Other models are left on their default.
 */
function thinkingMode(model: string): "between_tools" | "disabled" | undefined {
  if (/sonnet-5[.-]5\b/i.test(model)) return "between_tools";
  if (/claude-sonnet-5\b/i.test(model)) return "disabled";
  return undefined;
}

/** Text blocks only. A thinking block has no `text` and is often first. */
function messageText(data: { content?: { type?: string; text?: unknown }[] }): string {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("");
}

/** First complete `{...}` object, ignoring braces inside strings and any text after it. */
function parseJsonObject<T>(text: string): T {
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error("LLM returned no JSON object");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1)) as T;
      }
    }
  }

  throw new Error("LLM returned no JSON object");
}

function isCursorEndpoint(endpoint: string): boolean {
  try {
    return new URL(endpoint).hostname === "api.cursor.com";
  } catch {
    return false;
  }
}

async function completeWithCursor<T>(
  system: string,
  user: string,
  apiKey: string
): Promise<T> {
  const configured = process.env.LLM_MODEL;
  const model =
    !configured || configured === ANTHROPIC_DEFAULT_MODEL ? "auto" : configured;

  const { Agent, CursorAgentError } = await import("@cursor/sdk");

  let result;
  try {
    // The installed agent CLI rejects --system-prompt, so the guard goes in
    // the user message. tools: [] keeps the run from reading or editing files.
    const prompt = Agent.prompt(`${system}\n\n${user}`, {
      apiKey,
      model: { id: model },
      tools: [],
      local: {
        // Empty directory so the agent has no project files to read.
        cwd: mkdtempSync(path.join(tmpdir(), "ia-reviser-")),
        settingSources: [],
      },
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Cursor request timed out after 3 minutes")),
        TIMEOUT_MS
      );
    });
    try {
      result = await Promise.race([prompt, timeout]);
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(`Cursor request failed: ${error.message}`);
    }
    throw error;
  }

  if (result.status !== "finished" || !result.result) {
    throw new Error(
      result.error?.message || `Cursor run ended with status ${result.status}`
    );
  }

  return parseJsonObject<T>(result.result);
}

async function completeWithAnthropic<T>(
  system: string,
  user: string,
  endpoint: string,
  apiKey: string
): Promise<T> {
  const model = process.env.LLM_MODEL || ANTHROPIC_DEFAULT_MODEL;
  const thinking = thinkingMode(model);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      ...(thinking ? { thinking: { type: thinking } } : {}),
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = messageText(data);
  if (!text.trim()) {
    const reason = typeof data?.stop_reason === "string" ? data.stop_reason : "unknown";
    throw new Error(`LLM returned no text (stop_reason: ${reason})`);
  }
  return parseJsonObject<T>(text);
}

export async function completeJson<T>(
  system: string,
  user: string
): Promise<T> {
  const endpoint = process.env.LLM_API_ENDPOINT;
  const apiKey = process.env.LLM_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error("LLM_API_ENDPOINT and LLM_API_KEY must be set");
  }

  if (isCursorEndpoint(endpoint)) {
    return completeWithCursor(system, user, apiKey);
  }
  return completeWithAnthropic(system, user, endpoint, apiKey);
}
