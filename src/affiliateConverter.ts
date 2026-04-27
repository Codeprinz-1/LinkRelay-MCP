import type {
  LinkRelayConfig,
  StoreAffiliateConfig,
  ConversionResult,
  TextConversionResult,
} from "./types.js";
import {
  isAmazonUrl,
  convertAmazon,
  isEbayUrl,
  convertEbay,
  isWalmartUrl,
  convertWalmart,
  isBestBuyUrl,
  convertBestBuy,
  isTargetUrl,
  convertTarget,
} from "./stores/index.js";

/** Regex that matches http / https URLs inside a body of text */
const URL_REGEX = /https?:\/\/[^\s"'<>)\]]+/g;

type StoreHandler = {
  matcher: (url: URL) => boolean;
  converter: (url: URL, config: StoreAffiliateConfig) => ConversionResult;
  storeId: string;
};

const BUILT_IN_HANDLERS: StoreHandler[] = [
  { storeId: "amazon", matcher: isAmazonUrl, converter: convertAmazon },
  { storeId: "ebay", matcher: isEbayUrl, converter: convertEbay },
  { storeId: "walmart", matcher: isWalmartUrl, converter: convertWalmart },
  { storeId: "bestbuy", matcher: isBestBuyUrl, converter: convertBestBuy },
  { storeId: "target", matcher: isTargetUrl, converter: convertTarget },
];

/**
 * Core converter class. Instantiate once with the loaded configuration,
 * then call `convertUrl` or `convertLinksInText` as needed.
 */
export class AffiliateConverter {
  private readonly config: LinkRelayConfig;

  constructor(config: LinkRelayConfig) {
    this.config = config;
  }

  /**
   * Converts a single URL string to an affiliate URL.
   * Returns a `ConversionResult` describing what was (or was not) changed.
   */
  convertUrl(rawUrl: string): ConversionResult {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return {
        originalUrl: rawUrl,
        convertedUrl: rawUrl,
        store: null,
        converted: false,
        message: "The provided value is not a valid URL.",
      };
    }

    for (const handler of BUILT_IN_HANDLERS) {
      if (!handler.matcher(url)) continue;

      const storeConfig = this.config.stores[handler.storeId];
      if (!storeConfig || storeConfig.enabled === false) {
        return {
          originalUrl: rawUrl,
          convertedUrl: rawUrl,
          store: handler.storeId,
          converted: false,
          message: `Affiliate program for "${handler.storeId}" is not configured or is disabled.`,
        };
      }

      const affiliateCfg: StoreAffiliateConfig = {
        storeId: handler.storeId,
        storeName: storeConfig.storeName ?? handler.storeId,
        params: storeConfig.params ?? {},
        enabled: storeConfig.enabled,
      };

      return handler.converter(url, affiliateCfg);
    }

    // No handler matched
    return {
      originalUrl: rawUrl,
      convertedUrl: rawUrl,
      store: null,
      converted: false,
      message: "No affiliate program is configured for this URL's store.",
    };
  }

  /**
   * Extracts every http/https URL from `text`, attempts to convert each
   * one to an affiliate link, and returns the modified text along with
   * per-URL conversion details.
   */
  convertLinksInText(text: string): TextConversionResult {
    const conversions: TextConversionResult["conversions"] = [];
    let convertedText = text;

    const matches = [...text.matchAll(URL_REGEX)];
    // Deduplicate so we don't convert the same URL multiple times
    const seen = new Set<string>();

    for (const match of matches) {
      const original = match[0];
      if (seen.has(original)) continue;
      seen.add(original);

      const result = this.convertUrl(original);
      conversions.push({
        originalUrl: result.originalUrl,
        convertedUrl: result.convertedUrl,
        store: result.store,
        converted: result.converted,
      });

      if (result.converted) {
        // Replace all occurrences in the text
        convertedText = convertedText.split(original).join(result.convertedUrl);
      }
    }

    return {
      originalText: text,
      convertedText,
      conversions,
    };
  }
}
