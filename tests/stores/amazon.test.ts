import { isAmazonUrl, convertAmazon } from "../../src/stores/amazon";
import type { StoreAffiliateConfig } from "../../src/types";

const BASE_CONFIG: StoreAffiliateConfig = {
  storeId: "amazon",
  storeName: "Amazon",
  params: { associateId: "test-assoc-20" },
  enabled: true,
};

describe("isAmazonUrl", () => {
  it("matches standard amazon.com URLs", () => {
    expect(isAmazonUrl(new URL("https://www.amazon.com/dp/B08N5WRWNW"))).toBe(true);
  });

  it("matches international Amazon domains", () => {
    expect(isAmazonUrl(new URL("https://www.amazon.co.uk/dp/B08N5WRWNW"))).toBe(true);
    expect(isAmazonUrl(new URL("https://amazon.de/dp/B08N5WRWNW"))).toBe(true);
    expect(isAmazonUrl(new URL("https://amazon.co.jp/dp/B08N5WRWNW"))).toBe(true);
  });

  it("matches Amazon short-link domains", () => {
    expect(isAmazonUrl(new URL("https://amzn.to/3xY1234"))).toBe(true);
    expect(isAmazonUrl(new URL("https://a.co/d/abc123"))).toBe(true);
  });

  it("does not match non-Amazon domains", () => {
    expect(isAmazonUrl(new URL("https://www.ebay.com/itm/123"))).toBe(false);
    expect(isAmazonUrl(new URL("https://walmart.com/ip/Product/123"))).toBe(false);
    expect(isAmazonUrl(new URL("https://fake-amazon.com/dp/ABC"))).toBe(false);
  });
});

describe("convertAmazon", () => {
  it("appends the associate tag to a clean URL", () => {
    const url = new URL("https://www.amazon.com/dp/B08N5WRWNW");
    const result = convertAmazon(url, BASE_CONFIG);

    expect(result.converted).toBe(true);
    expect(result.store).toBe("amazon");
    expect(result.convertedUrl).toContain("tag=test-assoc-20");
    expect(result.originalUrl).toBe("https://www.amazon.com/dp/B08N5WRWNW");
  });

  it("replaces an existing tag parameter", () => {
    const url = new URL("https://www.amazon.com/dp/B08N5WRWNW?tag=old-tag-20");
    const result = convertAmazon(url, BASE_CONFIG);

    expect(result.converted).toBe(true);
    const converted = new URL(result.convertedUrl);
    expect(converted.searchParams.get("tag")).toBe("test-assoc-20");
    // Should appear exactly once
    expect(result.convertedUrl.split("tag=").length - 1).toBe(1);
  });

  it("preserves existing query parameters", () => {
    const url = new URL("https://www.amazon.com/dp/B08N5WRWNW?ref=pd_rhf_dp_s");
    const result = convertAmazon(url, BASE_CONFIG);

    expect(result.converted).toBe(true);
    const converted = new URL(result.convertedUrl);
    expect(converted.searchParams.get("ref")).toBe("pd_rhf_dp_s");
    expect(converted.searchParams.get("tag")).toBe("test-assoc-20");
  });

  it("does not convert a short URL", () => {
    const url = new URL("https://amzn.to/3xY1234");
    const result = convertAmazon(url, BASE_CONFIG);

    expect(result.converted).toBe(false);
    expect(result.store).toBe("amazon");
    expect(result.convertedUrl).toBe("https://amzn.to/3xY1234");
  });

  it("returns not-converted when associateId is missing", () => {
    const cfg: StoreAffiliateConfig = { ...BASE_CONFIG, params: {} };
    const url = new URL("https://www.amazon.com/dp/B08N5WRWNW");
    const result = convertAmazon(url, cfg);

    expect(result.converted).toBe(false);
    expect(result.convertedUrl).toBe(result.originalUrl);
  });
});
