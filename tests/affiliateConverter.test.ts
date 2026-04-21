import { AffiliateConverter } from "../src/affiliateConverter";
import type { LinkRelayConfig } from "../src/types";

const FULL_CONFIG: LinkRelayConfig = {
  stores: {
    amazon: {
      storeName: "Amazon",
      enabled: true,
      params: { associateId: "myshop-20" },
    },
    ebay: {
      storeName: "eBay",
      enabled: true,
      params: { campaignId: "5338765432", publisherId: "5575123456" },
    },
    walmart: {
      storeName: "Walmart",
      enabled: true,
      params: { publisherId: "imp_pub_123" },
    },
    bestbuy: {
      storeName: "Best Buy",
      enabled: true,
      params: { publisherId: "cj_pub_456" },
    },
    target: {
      storeName: "Target",
      enabled: true,
      params: { affiliateId: "tgt_aff_789" },
    },
  },
};

describe("AffiliateConverter.convertUrl", () => {
  const converter = new AffiliateConverter(FULL_CONFIG);

  it("converts an Amazon URL", () => {
    const result = converter.convertUrl(
      "https://www.amazon.com/dp/B08N5WRWNW"
    );
    expect(result.converted).toBe(true);
    expect(result.store).toBe("amazon");
    expect(result.convertedUrl).toContain("tag=myshop-20");
  });

  it("converts an eBay URL", () => {
    const result = converter.convertUrl(
      "https://www.ebay.com/itm/1234567890"
    );
    expect(result.converted).toBe(true);
    expect(result.store).toBe("ebay");
    expect(result.convertedUrl).toContain("rover.ebay.com");
  });

  it("converts a Walmart URL", () => {
    const result = converter.convertUrl(
      "https://www.walmart.com/ip/Product/123456"
    );
    expect(result.converted).toBe(true);
    expect(result.store).toBe("walmart");
    expect(result.convertedUrl).toContain("wmlspartner=imp_pub_123");
  });

  it("converts a Best Buy URL", () => {
    const result = converter.convertUrl(
      "https://www.bestbuy.com/site/product/1234567.p"
    );
    expect(result.converted).toBe(true);
    expect(result.store).toBe("bestbuy");
    expect(result.convertedUrl).toContain("ref=cj_pub_456");
  });

  it("converts a Target URL", () => {
    const result = converter.convertUrl(
      "https://www.target.com/p/product/-/A-12345678"
    );
    expect(result.converted).toBe(true);
    expect(result.store).toBe("target");
    expect(result.convertedUrl).toContain("afid=tgt_aff_789");
  });

  it("returns not-converted for an unknown store", () => {
    const result = converter.convertUrl("https://www.example.com/product/1");
    expect(result.converted).toBe(false);
    expect(result.store).toBeNull();
    expect(result.convertedUrl).toBe(result.originalUrl);
  });

  it("returns not-converted for a disabled store", () => {
    const cfg: LinkRelayConfig = {
      stores: {
        amazon: { storeName: "Amazon", enabled: false, params: { associateId: "x-20" } },
      },
    };
    const c = new AffiliateConverter(cfg);
    const result = c.convertUrl("https://www.amazon.com/dp/B08N5WRWNW");
    expect(result.converted).toBe(false);
    expect(result.convertedUrl).toBe(result.originalUrl);
  });

  it("returns not-converted for an invalid URL", () => {
    const result = converter.convertUrl("not-a-url");
    expect(result.converted).toBe(false);
    expect(result.store).toBeNull();
  });

  it("returns not-converted when store has no config", () => {
    const emptyConverter = new AffiliateConverter({ stores: {} });
    const result = emptyConverter.convertUrl(
      "https://www.amazon.com/dp/B08N5WRWNW"
    );
    expect(result.converted).toBe(false);
  });
});

describe("AffiliateConverter.convertLinksInText", () => {
  const converter = new AffiliateConverter(FULL_CONFIG);

  it("converts all eligible URLs in a block of text", () => {
    const text =
      "Check out this laptop: https://www.amazon.com/dp/B08N5WRWNW and " +
      "this one on eBay: https://www.ebay.com/itm/1234567890";

    const result = converter.convertLinksInText(text);
    expect(result.conversions).toHaveLength(2);
    expect(result.conversions.every((c) => c.converted)).toBe(true);

    // The converted text must contain the affiliate-tagged Amazon URL
    expect(result.convertedText).toContain("tag=myshop-20");
    // The converted text must contain the eBay rover URL
    expect(result.convertedText).toContain("rover.ebay.com");
    // The plain (no-tag) Amazon URL should no longer appear in the text
    expect(result.convertedText).not.toContain(
      "https://www.amazon.com/dp/B08N5WRWNW "
    );
  });

  it("leaves unknown-store URLs unchanged", () => {
    const text = "Visit https://www.example.com for more info.";
    const result = converter.convertLinksInText(text);

    expect(result.convertedText).toBe(text);
    expect(result.conversions[0].converted).toBe(false);
  });

  it("deduplicates repeated URLs so they appear only once in conversions", () => {
    const url = "https://www.amazon.com/dp/B08N5WRWNW";
    const text = `${url} and again ${url}`;
    const result = converter.convertLinksInText(text);

    // Only one entry in conversions even though the URL appeared twice
    expect(result.conversions).toHaveLength(1);
    // The converted text should contain the affiliate URL (with tag) in both places
    expect(result.convertedText).toContain("tag=myshop-20");
    // The bare original URL (without query) should no longer appear
    expect(result.convertedText).not.toMatch(
      /https:\/\/www\.amazon\.com\/dp\/B08N5WRWNW(?!\?)/
    );
  });

  it("returns unchanged text when there are no URLs", () => {
    const text = "No links here at all.";
    const result = converter.convertLinksInText(text);

    expect(result.convertedText).toBe(text);
    expect(result.conversions).toHaveLength(0);
  });

  it("preserves originalText exactly", () => {
    const text = "Buy at https://www.amazon.com/dp/B08N5WRWNW today!";
    const result = converter.convertLinksInText(text);
    expect(result.originalText).toBe(text);
  });
});
