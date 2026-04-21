import type { StoreAffiliateConfig, ConversionResult } from "../types.js";

/** Domains (and their TLD variants) that belong to Amazon */
const AMAZON_DOMAINS = [
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.de",
  "amazon.fr",
  "amazon.co.jp",
  "amazon.com.au",
  "amazon.in",
  "amazon.es",
  "amazon.it",
  "amazon.nl",
  "amazon.com.br",
  "amazon.com.mx",
  "amazon.se",
  "amazon.pl",
  "amazon.sg",
  "amazon.ae",
  "amazon.sa",
  "amazon.com.tr",
  "amazon.eg",
];

const AMAZON_SHORT_DOMAINS = ["amzn.to", "a.co", "amzn.eu"];

export function isAmazonUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return (
    AMAZON_DOMAINS.includes(host) || AMAZON_SHORT_DOMAINS.includes(host)
  );
}

/**
 * Converts an Amazon product URL to an Associates affiliate link by
 * appending (or replacing) the `tag` query parameter.
 *
 * Short URLs (amzn.to, a.co) cannot be reliably transformed without
 * making an HTTP request; they are returned as-is with a note.
 */
export function convertAmazon(
  url: URL,
  config: StoreAffiliateConfig
): ConversionResult {
  const originalUrl = url.toString();
  const host = url.hostname.replace(/^www\./, "");
  const associateId: string = config.params["associateId"] ?? "";

  if (!associateId) {
    return noConfig(originalUrl, "amazon");
  }

  // Short URLs cannot be rewritten without a redirect-follow round-trip
  if (AMAZON_SHORT_DOMAINS.includes(host)) {
    return {
      originalUrl,
      convertedUrl: originalUrl,
      store: "amazon",
      converted: false,
      message:
        "Shortened Amazon URLs (amzn.to / a.co) cannot be converted " +
        "without resolving the redirect first.",
    };
  }

  const out = new URL(url.toString());
  out.searchParams.set("tag", associateId);

  return {
    originalUrl,
    convertedUrl: out.toString(),
    store: "amazon",
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
