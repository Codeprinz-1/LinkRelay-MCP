import type { StoreAffiliateConfig, ConversionResult } from "../types.js";

export function isTargetUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "target.com";
}

/**
 * Converts a Target product URL to an Impact Radius affiliate link.
 *
 * Required config params:
 *   - affiliateId – Your Impact Radius affiliate / SID
 */
export function convertTarget(
  url: URL,
  config: StoreAffiliateConfig
): ConversionResult {
  const originalUrl = url.toString();
  const affiliateId: string = config.params["affiliateId"] ?? "";

  if (!affiliateId) {
    return noConfig(originalUrl, "target");
  }

  const out = new URL(url.toString());
  out.searchParams.set("afid", affiliateId);

  return {
    originalUrl,
    convertedUrl: out.toString(),
    store: "target",
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
