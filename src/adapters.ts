/**
 * Provider-specific stream adapters for LinkRelay.
 *
 * All types here are structural (duck-typed) — there are zero imports from
 * any LLM SDK.  As long as the stream your provider returns matches the
 * shape of the relevant interface, the adapter will work regardless of
 * which SDK version (or which bundler tree-shaking strategy) you use.
 *
 * Vercel AI SDK note: its `textStream` is already `AsyncIterable<string>`,
 * so you can pass it directly to `wrapStream` without an adapter.
 */

import { wrapGenericStream } from "./streaming.js";
import type { LinkRelayConfig } from "./types.js";

// ── OpenAI ─────────────────────────────────────────────────────────────────

/** Structural subset of an OpenAI streaming chunk (chat completions). */
interface OpenAIChunk {
  choices: Array<{
    delta: {
      content?: string | null;
    };
  }>;
}

/**
 * Wraps an OpenAI chat-completions stream (`openai.chat.completions.stream(…)`)
 * and yields affiliate-converted text chunks.
 *
 * @example
 * ```ts
 * import OpenAI from "openai";
 * const openai = new OpenAI();
 * const raw = openai.beta.chat.completions.stream({ model: "gpt-4o", messages });
 * for await (const chunk of wrapOpenAIStream(raw, config)) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export function wrapOpenAIStream(
  stream: AsyncIterable<OpenAIChunk>,
  config: LinkRelayConfig
): AsyncGenerator<string> {
  return wrapGenericStream(stream, config, (chunk) => {
    return chunk.choices[0]?.delta?.content ?? null;
  });
}

// ── Anthropic ──────────────────────────────────────────────────────────────

/** Structural subset of an Anthropic SSE streaming event. */
interface AnthropicEvent {
  type: string;
  delta?: {
    type?: string;
    text?: string;
  };
}

/**
 * Wraps an Anthropic messages stream (`anthropic.messages.stream(…)`)
 * and yields affiliate-converted text chunks.
 *
 * Only `content_block_delta` events with a `text_delta` are forwarded;
 * all other event types (metadata, usage, etc.) are skipped.
 *
 * @example
 * ```ts
 * import Anthropic from "@anthropic-ai/sdk";
 * const client = new Anthropic();
 * const raw = client.messages.stream({ model: "claude-3-5-sonnet-latest", … });
 * for await (const chunk of wrapAnthropicStream(raw, config)) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export function wrapAnthropicStream(
  stream: AsyncIterable<AnthropicEvent>,
  config: LinkRelayConfig
): AsyncGenerator<string> {
  return wrapGenericStream(stream, config, (event) => {
    if (
      event.type === "content_block_delta" &&
      event.delta?.type === "text_delta" &&
      typeof event.delta.text === "string"
    ) {
      return event.delta.text;
    }
    return null;
  });
}

// ── LangChain ──────────────────────────────────────────────────────────────

/** LangChain content can be a plain string or an array of typed parts. */
type LangChainContentPart = { type: string; text?: string };
type LangChainContent = string | LangChainContentPart[];

/** Structural subset of a LangChain `BaseMessageChunk`. */
interface LangChainChunk {
  content: LangChainContent;
}

function extractLangChainText(content: LangChainContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((part): part is LangChainContentPart & { text: string } =>
      part.type === "text" && typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("");
}

/**
 * Wraps a LangChain streaming response and yields affiliate-converted chunks.
 *
 * Handles both plain-string content and multi-modal content arrays
 * (only `type: "text"` parts are forwarded).
 *
 * @example
 * ```ts
 * import { ChatOpenAI } from "@langchain/openai";
 * const model = new ChatOpenAI({ streaming: true });
 * const raw = await model.stream("Tell me about …");
 * for await (const chunk of wrapLangChainStream(raw, config)) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export function wrapLangChainStream(
  stream: AsyncIterable<LangChainChunk>,
  config: LinkRelayConfig
): AsyncGenerator<string> {
  return wrapGenericStream(stream, config, (chunk) => {
    const text = extractLangChainText(chunk.content);
    return text || null;
  });
}
