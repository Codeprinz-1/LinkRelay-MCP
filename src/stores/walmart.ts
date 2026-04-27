import type { StoreAffiliateConfig, ConversionResult } from "../types.js";

export function isWalmartUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "walmart.com" || host === "walmart.ca";
}

/**
 * Converts a Walmart product URL to an Impact Radius affiliate link.
 *
 * Required config params:
 *   - publisherId – Your Impact Radius publisher/partner id (irpid)
 *   - campaignId  – Optional Impact Radius campaign id (irgwc)
 */
export function convertWalmart(
  url: URL,
  config: StoreAffiliateConfig
): ConversionResult {
  const originalUrl = url.toString();
  const publisherId: string = config.params["publisherId"] ?? "";

  if (!publisherId) {
    return noConfig(originalUrl, "walmart");
  }

  const out = new URL(url.toString());
  out.searchParams.set("wmlspartner", publisherId);
  out.searchParams.set("selectedSellerId", "0");
  if (config.params["campaignId"]) {
    out.searchParams.set("adid", config.params["campaignId"]);
  }

  return {
    originalUrl,
    convertedUrl: out.toString(),
    store: "walmart",
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
