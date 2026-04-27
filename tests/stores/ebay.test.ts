import { isEbayUrl, convertEbay } from "../../src/stores/ebay";
import type { StoreAffiliateConfig } from "../../src/types";

const BASE_CONFIG: StoreAffiliateConfig = {
  storeId: "ebay",
  storeName: "eBay",
  params: { campaignId: "5338765432", publisherId: "5575123456" },
  enabled: true,
};

describe("isEbayUrl", () => {
  it("matches ebay.com", () => {
    expect(isEbayUrl(new URL("https://www.ebay.com/itm/1234567890"))).toBe(true);
  });

  it("matches international eBay domains", () => {
    expect(isEbayUrl(new URL("https://www.ebay.co.uk/itm/123"))).toBe(true);
    expect(isEbayUrl(new URL("https://ebay.de/itm/123"))).toBe(true);
  });

  it("does not match non-eBay domains", () => {
    expect(isEbayUrl(new URL("https://www.amazon.com/dp/ABC"))).toBe(false);
    expect(isEbayUrl(new URL("https://fake-ebay.com/itm/123"))).toBe(false);
  });
});

describe("convertEbay", () => {
  it("returns a rover.ebay.com redirect URL", () => {
    const url = new URL("https://www.ebay.com/itm/1234567890");
    const result = convertEbay(url, BASE_CONFIG);

    expect(result.converted).toBe(true);
    expect(result.store).toBe("ebay");
    expect(result.convertedUrl).toContain("rover.ebay.com");
    expect(result.convertedUrl).toContain("campid=5338765432");
    expect(result.convertedUrl).toContain("pub=5575123456");
  });

  it("encodes the original listing URL in the mpre parameter", () => {
    const listingUrl = "https://www.ebay.com/itm/1234567890";
    const url = new URL(listingUrl);
    const result = convertEbay(url, BASE_CONFIG);

    expect(result.converted).toBe(true);
    const roverUrl = new URL(result.convertedUrl);
    expect(decodeURIComponent(roverUrl.searchParams.get("mpre") ?? "")).toBe(
      listingUrl
    );
  });

  it("returns not-converted when campaignId is missing", () => {
    const cfg: StoreAffiliateConfig = { ...BASE_CONFIG, params: {} };
    const url = new URL("https://www.ebay.com/itm/1234567890");
    const result = convertEbay(url, cfg);

    expect(result.converted).toBe(false);
    expect(result.convertedUrl).toBe(result.originalUrl);
  });
});
