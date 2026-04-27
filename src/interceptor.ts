import { AffiliateConverter } from "./affiliateConverter.js";
import type { LinkRelayConfig } from "./types.js";

/**
 * Returns the index at which a trailing (potentially incomplete) URL begins,
 * or -1 if the text does not end with an unfinished URL.
 *
 * Strategy: find the last `http://` or `https://` in the text and check
 * whether everything from that position to the end of the string is
 * whitespace-free.  Using `lastIndexOf` + a simple whitespace test avoids
 * the polynomial backtracking that a trailing-URL regex would introduce on
 * inputs with many repeated `http://` sequences.
 */
function trailingUrlStart(text: string): number {
  const lastHttps = text.lastIndexOf("https://");
  const lastHttp = text.lastIndexOf("http://");
  const idx = Math.max(lastHttps, lastHttp);
  if (idx === -1) return -1;
  // If any whitespace exists after the URL start, the URL is complete (or
  // not present at the very end) — nothing to buffer.
  const tail = text.slice(idx);
  return /\s/.test(tail) ? -1 : idx;
}

/**
 * Stateful, chunk-by-chunk link interceptor for streaming LLM responses.
 *
 * Feed each text chunk through `processChunk` as it arrives, then call
 * `flush` once the stream ends to drain any buffered remainder.
 *
 * @example
 * ```ts
 * const interceptor = new LinkRelayInterceptor(config);
 * for await (const delta of stream) {
 *   process.stdout.write(interceptor.processChunk(delta));
 * }
 * process.stdout.write(interceptor.flush());
 * ```
 */
export class LinkRelayInterceptor {
  private readonly converter: AffiliateConverter;
  /** Holds the tail of the previous chunk when it ended mid-URL. */
  private buffer: string = "";

  constructor(config: LinkRelayConfig) {
    this.converter = new AffiliateConverter(config);
  }

  /**
   * Processes one text chunk from the stream.
   *
   * If the combined text (buffered tail + new chunk) ends with what looks
   * like an incomplete URL, that tail is held back until the next call so
   * that URLs split across chunk boundaries are converted correctly.
   *
   * @returns The safe-to-emit converted text for this chunk (may be empty).
   */
  processChunk(chunk: string): string {
    const text = this.buffer + chunk;
    this.buffer = "";

    // If the text ends with a URL-like sequence (no trailing whitespace),
    // hold back that suffix — it may continue in the next chunk.
    const cutPoint = trailingUrlStart(text);
    let toProcess: string;

    if (cutPoint !== -1) {
      toProcess = text.slice(0, cutPoint);
      this.buffer = text.slice(cutPoint);
    } else {
      toProcess = text;
    }

    if (!toProcess) return "";
    return this.converter.convertLinksInText(toProcess).convertedText;
  }

  /**
   * Flushes the internal buffer once the stream has ended.
   *
   * Must be called exactly once after the last chunk; returns the converted
   * form of any text that was held back by `processChunk`.
   *
   * @returns Converted text for the buffered remainder (may be empty).
   */
  flush(): string {
    const remaining = this.buffer;
    this.buffer = "";
    if (!remaining) return "";
    return this.converter.convertLinksInText(remaining).convertedText;
  }
}
