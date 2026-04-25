import { LinkRelayInterceptor } from "../src/interceptor";
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

const EMPTY_CONFIG: LinkRelayConfig = { stores: {} };

function makeInterceptor(cfg = CONFIG) {
  return new LinkRelayInterceptor(cfg);
}

// ── processChunk ────────────────────────────────────────────────────────────

describe("LinkRelayInterceptor.processChunk", () => {
  it("converts a complete URL that is the only content in a chunk", () => {
    const i = makeInterceptor();
    const out = i.processChunk("https://www.amazon.com/dp/B08N5WRWNW ");
    expect(out).toContain("tag=test-20");
  });

  it("passes through plain text with no URLs unchanged", () => {
    const i = makeInterceptor();
    const out = i.processChunk("Hello, world! ");
    expect(out).toBe("Hello, world! ");
  });

  it("buffers a trailing partial URL and emits nothing for that portion", () => {
    const i = makeInterceptor();
    // Chunk ends mid-URL — no whitespace after the URL
    const out = i.processChunk("Check this: https://www.amazon.com/dp/B08N");
    // The URL prefix must be buffered; only the preceding text is emitted
    expect(out).toBe("Check this: ");
    expect(out).not.toContain("amazon");
  });

  it("completes a buffered URL when the next chunk finishes it", () => {
    const i = makeInterceptor();
    i.processChunk("Buy: https://www.amazon.com/dp/B08N");
    // Second chunk completes the URL and adds trailing whitespace
    const out = i.processChunk("5WRWNW now!");
    expect(out).toContain("tag=test-20");
  });

  it("converts URLs in the middle of text correctly", () => {
    const i = makeInterceptor();
    const out = i.processChunk(
      "See https://www.amazon.com/dp/B08N5WRWNW for details. "
    );
    expect(out).toContain("tag=test-20");
    expect(out).toContain("for details.");
  });

  it("emits an empty string when only a partial URL was received", () => {
    const i = makeInterceptor();
    const out = i.processChunk("https://www.amazon.com/dp/");
    // Entire chunk is a URL prefix — buffered, nothing emitted yet
    expect(out).toBe("");
  });

  it("returns an empty string for an empty chunk", () => {
    const i = makeInterceptor();
    expect(i.processChunk("")).toBe("");
  });

  it("leaves unrecognised store URLs unchanged", () => {
    const i = makeInterceptor();
    const out = i.processChunk("Visit https://www.example.com/page today. ");
    expect(out).toContain("https://www.example.com/page");
    expect(out).not.toContain("tag=");
  });
});

// ── flush ────────────────────────────────────────────────────────────────────

describe("LinkRelayInterceptor.flush", () => {
  it("converts a buffered partial URL on flush", () => {
    const i = makeInterceptor();
    i.processChunk("https://www.amazon.com/dp/B08N5WRWNW");
    const out = i.flush();
    expect(out).toContain("tag=test-20");
  });

  it("returns an empty string when the buffer is empty", () => {
    const i = makeInterceptor();
    i.processChunk("No links here. ");
    expect(i.flush()).toBe("");
  });

  it("clears the buffer after flush so a second flush returns empty", () => {
    const i = makeInterceptor();
    i.processChunk("https://www.amazon.com/dp/B08N5WRWNW");
    i.flush();
    expect(i.flush()).toBe("");
  });

  it("emits buffered text unchanged when no store is configured", () => {
    const i = new LinkRelayInterceptor(EMPTY_CONFIG);
    i.processChunk("https://www.amazon.com/dp/B08N5WRWNW");
    const out = i.flush();
    expect(out).toContain("amazon.com");
    expect(out).not.toContain("tag=");
  });
});

// ── multi-chunk integration ───────────────────────────────────────────────

describe("LinkRelayInterceptor multi-chunk round-trip", () => {
  it("reassembles a URL split across three chunks", () => {
    const i = makeInterceptor();
    const a = i.processChunk("Here: https://www.amazon.com");
    const b = i.processChunk("/dp/B08N5WRW");
    const c = i.processChunk("NW done. ");
    const flushed = i.flush();

    const full = a + b + c + flushed;
    expect(full).toContain("tag=test-20");
    expect(full).toContain("Here:");
    expect(full).toContain("done.");
  });

  it("handles back-to-back URLs each split at different points", () => {
    const i = makeInterceptor();
    const chunks = [
      "First: https://www.amazon.com/dp/B111",
      "1111 Second: https://www.amazon.com/dp/B222",
      "2222 end. ",
    ];
    const combined = chunks.map((c) => i.processChunk(c)).join("") + i.flush();
    // Both URLs must be affiliate-tagged
    expect(combined.match(/tag=test-20/g)?.length).toBe(2);
  });
});
