import type { StoreAffiliateConfig, ConversionResult } from "../types.js";

const EBAY_DOMAINS = [
  "ebay.com",
  "ebay.co.uk",
  "ebay.de",
  "ebay.fr",
  "ebay.it",
  "ebay.es",
  "ebay.com.au",
  "ebay.ca",
  "ebay.at",
  "ebay.be",
  "ebay.nl",
  "ebay.pl",
];

export function isEbayUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return EBAY_DOMAINS.includes(host);
}

/**
 * Converts an eBay product/listing URL to an affiliate link using the
 * eBay Partner Network (EPN) rover redirect URL.
 *
 * Required config params:
 *   - campaignId  – Your EPN campaign id (campid)
 *   - publisherId – Your EPN publisher id (pub)  [optional]
 *   - toolId      – Defaults to "10001"
 */
export function convertEbay(
  url: URL,
  config: StoreAffiliateConfig
): ConversionResult {
  const originalUrl = url.toString();
  const campaignId: string = config.params["campaignId"] ?? "";

  if (!campaignId) {
    return noConfig(originalUrl, "ebay");
  }

  const toolId = config.params["toolId"] ?? "10001";

  // Determine the rover rotation id from the eBay TLD (US by default)
  const host = url.hostname.replace(/^www\./, "");
  const rotationId = ROTATION_IDS[host] ?? "711-53200-19255-0";

  const roverUrl = new URL(
    `https://rover.ebay.com/rover/1/${rotationId}/1`
  );
  roverUrl.searchParams.set("toolid", toolId);
  roverUrl.searchParams.set("campid", campaignId);
  roverUrl.searchParams.set("ff3", "1");
  roverUrl.searchParams.set("mkevt", "1");
  roverUrl.searchParams.set("mkcid", "1");
  roverUrl.searchParams.set("mkrid", rotationId);
  roverUrl.searchParams.set("mpre", originalUrl);

  if (config.params["publisherId"]) {
    roverUrl.searchParams.set("pub", config.params["publisherId"]);
  }

  return {
    originalUrl,
    convertedUrl: roverUrl.toString(),
    store: "ebay",
    converted: true,
  };
}

/** EPN rover rotation IDs per eBay domain */
const ROTATION_IDS: Record<string, string> = {
  "ebay.com": "711-53200-19255-0",
  "ebay.co.uk": "710-53481-19255-0",
  "ebay.de": "707-53477-19255-0",
  "ebay.fr": "709-53476-19255-0",
  "ebay.it": "724-53478-19255-0",
  "ebay.es": "1185-53479-19255-0",
  "ebay.com.au": "705-53470-19255-0",
  "ebay.ca": "706-53473-19255-0",
  "ebay.at": "5221-53469-19255-0",
  "ebay.be": "1553-53471-19255-0",
  "ebay.nl": "1346-53482-19255-0",
  "ebay.pl": "3386-53488-19255-0",
};

function noConfig(originalUrl: string, store: string): ConversionResult {
  return {
    originalUrl,
    convertedUrl: originalUrl,
    store,
    converted: false,
    message: `No affiliate configuration found for store "${store}".`,
  };
}
