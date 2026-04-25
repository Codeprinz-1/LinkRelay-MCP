import { wrapStream, wrapGenericStream } from "../src/streaming";
import { wrapOpenAIStream, wrapAnthropicStream, wrapLangChainStream } from "../src/adapters";
import type { LinkRelayConfig } from "../src/types";

const CONFIG: LinkRelayConfig = {
  stores: {
    amazon: {
      storeName: "Amazon",
      enabled: true,
      params: { associateId: "test-20" },
    },
  },
};

/** Collects all chunks from an AsyncGenerator into a single string. */
async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = "";
  for await (const chunk of gen) out += chunk;
  return out;
}

/** Creates an AsyncIterable from an array of strings. */
async function* toStream(chunks: string[]): AsyncGenerator<string> {
  for (const c of chunks) yield c;
}

// ── wrapStream ───────────────────────────────────────────────────────────────

describe("wrapStream", () => {
  it("converts a single-chunk stream containing an affiliate URL", async () => {
    const stream = toStream(["Buy at https://www.amazon.com/dp/B08N5WRWNW today. "]);
    const result = await collect(wrapStream(stream, CONFIG));
    expect(result).toContain("tag=test-20");
    expect(result).toContain("Buy at");
    expect(result).toContain("today.");
  });

  it("converts a URL split across two chunks", async () => {
    const stream = toStream([
      "https://www.amazon.com/dp/",
      "B08N5WRWNW end. ",
    ]);
    const result = await collect(wrapStream(stream, CONFIG));
    expect(result).toContain("tag=test-20");
  });

  it("passes through plain text with no URLs", async () => {
    const text = "No links here at all.";
    const stream = toStream([text]);
    const result = await collect(wrapStream(stream, CONFIG));
    expect(result).toBe(text);
  });

  it("handles an empty stream", async () => {
    const result = await collect(wrapStream(toStream([]), CONFIG));
    expect(result).toBe("");
  });

  it("handles a stream whose only content is a URL (no trailing space)", async () => {
    const stream = toStream(["https://www.amazon.com/dp/B08N5WRWNW"]);
    const result = await collect(wrapStream(stream, CONFIG));
    expect(result).toContain("tag=test-20");
  });
});

// ── wrapGenericStream ─────────────────────────────────────────────────────────

describe("wrapGenericStream", () => {
  it("applies extractor and converts affiliate URLs", async () => {
    async function* source() {
      yield { text: "See https://www.amazon.com/dp/B08N5WRWNW here. " };
    }
    const result = await collect(
      wrapGenericStream(source(), CONFIG, (item) => item.text)
    );
    expect(result).toContain("tag=test-20");
  });

  it("skips items where extractor returns null", async () => {
    async function* source() {
      yield { text: null as string | null };
      yield { text: "plain text. " };
    }
    const result = await collect(
      wrapGenericStream(source(), CONFIG, (item) => item.text)
    );
    expect(result).toBe("plain text. ");
  });
});

// ── wrapOpenAIStream ──────────────────────────────────────────────────────────

describe("wrapOpenAIStream", () => {
  it("extracts delta.content and converts affiliate URLs", async () => {
    async function* openaiStream() {
      yield { choices: [{ delta: { content: "Check " } }] };
      yield { choices: [{ delta: { content: "https://www.amazon.com/dp/B08N5WRWNW" } }] };
      yield { choices: [{ delta: { content: " out! " } }] };
    }
    const result = await collect(wrapOpenAIStream(openaiStream(), CONFIG));
    expect(result).toContain("tag=test-20");
    expect(result).toContain("Check");
    expect(result).toContain("out!");
  });

  it("skips chunks with null or missing delta.content", async () => {
    async function* openaiStream() {
      yield { choices: [{ delta: { content: null } }] };
      yield { choices: [{ delta: {} }] };
      yield { choices: [{ delta: { content: "text. " } }] };
    }
    const result = await collect(wrapOpenAIStream(openaiStream(), CONFIG));
    expect(result).toBe("text. ");
  });

  it("handles an empty choices array gracefully", async () => {
    async function* openaiStream() {
      yield { choices: [] };
    }
    const result = await collect(wrapOpenAIStream(openaiStream(), CONFIG));
    expect(result).toBe("");
  });
});

// ── wrapAnthropicStream ───────────────────────────────────────────────────────

describe("wrapAnthropicStream", () => {
  it("extracts text_delta events and converts affiliate URLs", async () => {
    async function* anthropicStream() {
      yield { type: "message_start", message: {} };
      yield { type: "content_block_start", index: 0, content_block: {} };
      yield {
        type: "content_block_delta",
        delta: { type: "text_delta", text: "Visit https://www.amazon.com/dp/B08N5WRWNW " },
      };
      yield { type: "content_block_stop" };
    }
    const result = await collect(wrapAnthropicStream(anthropicStream(), CONFIG));
    expect(result).toContain("tag=test-20");
  });

  it("ignores non-text_delta events", async () => {
    async function* anthropicStream() {
      yield { type: "message_start" };
      yield { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: "{}" } };
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "hello. " } };
    }
    const result = await collect(wrapAnthropicStream(anthropicStream(), CONFIG));
    expect(result).toBe("hello. ");
  });
});

// ── wrapLangChainStream ───────────────────────────────────────────────────────

describe("wrapLangChainStream", () => {
  it("handles string content", async () => {
    async function* lcStream() {
      yield { content: "Buy https://www.amazon.com/dp/B08N5WRWNW now. " };
    }
    const result = await collect(wrapLangChainStream(lcStream(), CONFIG));
    expect(result).toContain("tag=test-20");
  });

  it("handles multi-modal content arrays (text parts only)", async () => {
    async function* lcStream() {
      yield {
        content: [
          { type: "text", text: "See https://www.amazon.com/dp/B08N5WRWNW " },
          { type: "image_url", image_url: "data:..." },
        ],
      };
    }
    const result = await collect(wrapLangChainStream(lcStream(), CONFIG));
    expect(result).toContain("tag=test-20");
    expect(result).not.toContain("data:");
  });

  it("handles empty content arrays", async () => {
    async function* lcStream() {
      yield { content: [] };
    }
    const result = await collect(wrapLangChainStream(lcStream(), CONFIG));
    expect(result).toBe("");
  });
});
