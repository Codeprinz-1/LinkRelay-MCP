import { LinkRelayInterceptor } from "./interceptor.js";
import type { LinkRelayConfig } from "./types.js";

/**
 * Wraps an `AsyncIterable<string>` (e.g. the Vercel AI SDK `textStream`)
 * and yields converted chunks with affiliate links applied.
 *
 * URLs that span a chunk boundary are buffered automatically and emitted
 * once the full URL has been received.
 *
 * @example
 * ```ts
 * const converted = wrapStream(openaiTextStream, config);
 * for await (const chunk of converted) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export async function* wrapStream(
  stream: AsyncIterable<string>,
  config: LinkRelayConfig
): AsyncGenerator<string> {
  const interceptor = new LinkRelayInterceptor(config);

  for await (const chunk of stream) {
    const out = interceptor.processChunk(chunk);
    if (out) yield out;
  }

  const flushed = interceptor.flush();
  if (flushed) yield flushed;
}

/**
 * Wraps any `AsyncIterable<T>` using a caller-supplied `extractor` function
 * that pulls the text content out of each provider-specific event/chunk.
 * Return `null` (or an empty string) from the extractor to skip an event.
 *
 * This is the low-level primitive that the provider adapters in
 * `adapters.ts` are built on top of.
 *
 * @example
 * ```ts
 * // Custom extractor for a hypothetical provider
 * const converted = wrapGenericStream(stream, config, (evt) => evt.text ?? null);
 * ```
 */
export async function* wrapGenericStream<T>(
  stream: AsyncIterable<T>,
  config: LinkRelayConfig,
  extractor: (item: T) => string | null
): AsyncGenerator<string> {
  const interceptor = new LinkRelayInterceptor(config);

  for await (const item of stream) {
    const text = extractor(item);
    if (!text) continue;
    const out = interceptor.processChunk(text);
    if (out) yield out;
  }

  const flushed = interceptor.flush();
  if (flushed) yield flushed;
}
