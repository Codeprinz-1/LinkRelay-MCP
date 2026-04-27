// ── LinkRelay public library API ───────────────────────────────────────────
//
// Import from this module when using LinkRelay as a library in your own
// Node / edge / browser code.

// Core converter
export { AffiliateConverter } from "./affiliateConverter.js";

// Configuration loader
export { loadConfig } from "./config.js";

// Shared types
export type {
  LinkRelayConfig,
  StoreAffiliateConfig,
  ConversionResult,
  TextConversionResult,
} from "./types.js";

// Streaming layer
export { LinkRelayInterceptor } from "./interceptor.js";
export { wrapStream, wrapGenericStream } from "./streaming.js";
export { wrapOpenAIStream, wrapAnthropicStream, wrapLangChainStream } from "./adapters.js";
