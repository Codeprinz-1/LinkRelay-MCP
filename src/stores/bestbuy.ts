import type { StoreAffiliateConfig, ConversionResult } from "../types.js";

export function isBestBuyUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "bestbuy.com" || host === "bestbuy.ca";
}

/**
 * Converts a Best Buy product URL to a Commission Junction (CJ) affiliate link.
 *
 * Required config params:
 *   - publisherId – Your CJ publisher / PID
 *   - websiteId   – Your CJ website id (wid)  [optional]
 */
export function convertBestBuy(
  url: URL,
  config: StoreAffiliateConfig
): ConversionResult {
  const originalUrl = url.toString();
  const publisherId: string = config.params["publisherId"] ?? "";

  if (!publisherId) {
    return noConfig(originalUrl, "bestbuy");
  }

  const out = new URL(url.toString());
  out.searchParams.set("ref", publisherId);
  if (config.params["websiteId"]) {
    out.searchParams.set("loc", config.params["websiteId"]);
  }

  return {
    originalUrl,
    convertedUrl: out.toString(),
    store: "bestbuy",
    converted: true,
  };
}

function noConfig(originalUrl: string, store: string): ConversionResult {
  return {
    originalUrl,
    convertedUrl: originalUrl,
    store,
    converted: false,
    message: `No affiliate configuration found for store "${store}".`,
  };
}
