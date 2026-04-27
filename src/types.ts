/**
 * Configuration for a single affiliate program/store.
 */
export interface StoreAffiliateConfig {
  /** Unique store identifier (e.g. "amazon", "ebay") */
  storeId: string;
  /** Human-readable store name */
  storeName: string;
  /** Store-specific affiliate parameters (e.g. associateId, campaignId) */
  params: Record<string, string>;
  /** Whether this store is enabled */
  enabled: boolean;
}

/**
 * Top-level configuration loaded from linkrelay.config.json.
 */
export interface LinkRelayConfig {
  /** Map of storeId → affiliate config */
  stores: Record<string, Omit<StoreAffiliateConfig, "storeId">>;
}

/**
 * Result of converting a single URL.
 */
export interface ConversionResult {
  /** The original URL that was provided */
  originalUrl: string;
  /** The converted affiliate URL, or the original if no conversion was possible */
  convertedUrl: string;
  /** The detected store id, or null if the store was not recognised */
  store: string | null;
  /** true when the URL was actually modified */
  converted: boolean;
  /** Optional human-readable message describing what happened */
  message?: string;
}

/**
 * Result of converting all URLs found inside a block of text.
 */
export interface TextConversionResult {
  /** The original text as provided */
  originalText: string;
  /** The text with all eligible URLs replaced by their affiliate versions */
  convertedText: string;
  /** Details for each URL that was found */
  conversions: Array<Pick<ConversionResult, "originalUrl" | "convertedUrl" | "store" | "converted">>;
}
