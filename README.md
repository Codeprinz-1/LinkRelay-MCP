# LinkRelay

A TypeScript library that intercepts LLM streaming responses and rewrites product URLs into affiliate links on the fly, at zero cost to users.

Supports Amazon, eBay, Walmart, Best Buy, and Target. Works with any provider that exposes a streaming `AsyncIterable`.

---

## Supported Stores

| Store    | Affiliate Program                    | Required Config Params                              |
|----------|--------------------------------------|-----------------------------------------------------|
| Amazon   | Amazon Associates                    | `associateId` (e.g. `yourname-20`)                  |
| eBay     | eBay Partner Network (EPN)           | `campaignId`, `publisherId` (optional), `toolId`    |
| Walmart  | Impact Radius / Walmart Affiliates   | `publisherId`, `campaignId` (optional)              |
| Best Buy | Commission Junction (CJ)             | `publisherId`, `websiteId` (optional)               |
| Target   | Impact Radius / Target Affiliates    | `affiliateId`                                       |

---

## Install

```bash
npm install linkrelay-mcp
```

---

## Configure

Create a `linkrelay.config.json` file anywhere in your project tree and fill in your affiliate IDs:

```json
{
  "stores": {
    "amazon": {
      "storeName": "Amazon",
      "enabled": true,
      "params": {
        "associateId": "yourname-20"
      }
    },
    "ebay": {
      "storeName": "eBay",
      "enabled": true,
      "params": {
        "campaignId": "YOUR_EPN_CAMPAIGN_ID",
        "publisherId": "YOUR_EPN_PUBLISHER_ID"
      }
    }
  }
}
```

Set `"enabled": false` for any store you have not yet joined, or omit it entirely.

---

## Usage

### Vercel AI SDK (`textStream` is already `AsyncIterable<string>`)

```ts
import { wrapStream, loadConfig } from "linkrelay-mcp";

const config = loadConfig(); // reads linkrelay.config.json
const raw = result.textStream; // from the AI SDK
for await (const chunk of wrapStream(raw, config)) {
  process.stdout.write(chunk);
}
```

### OpenAI SDK

```ts
import OpenAI from "openai";
import { wrapOpenAIStream, loadConfig } from "linkrelay-mcp";

const openai = new OpenAI();
const config = loadConfig();
const raw = openai.beta.chat.completions.stream({ model: "gpt-4o", messages });
for await (const chunk of wrapOpenAIStream(raw, config)) {
  process.stdout.write(chunk);
}
```

### Anthropic SDK

```ts
import Anthropic from "@anthropic-ai/sdk";
import { wrapAnthropicStream, loadConfig } from "linkrelay-mcp";

const client = new Anthropic();
const config = loadConfig();
const raw = client.messages.stream({ model: "claude-3-5-sonnet-latest", messages, max_tokens: 1024 });
for await (const chunk of wrapAnthropicStream(raw, config)) {
  process.stdout.write(chunk);
}
```

### LangChain

```ts
import { ChatOpenAI } from "@langchain/openai";
import { wrapLangChainStream, loadConfig } from "linkrelay-mcp";

const config = loadConfig();
const model = new ChatOpenAI({ streaming: true });
const raw = await model.stream("Recommend a good laptop with links.");
for await (const chunk of wrapLangChainStream(raw, config)) {
  process.stdout.write(chunk);
}
```

### Custom provider

Use `wrapGenericStream` with any `AsyncIterable<T>` and a function that extracts the text from each event:

```ts
import { wrapGenericStream, loadConfig } from "linkrelay-mcp";

const config = loadConfig();
const converted = wrapGenericStream(myStream, config, (event) => event.text ?? null);
for await (const chunk of converted) {
  process.stdout.write(chunk);
}
```

URLs that span a chunk boundary are automatically buffered and reassembled, so conversions are always accurate regardless of where the provider splits its output.

---

## One-shot conversion (no stream)

```ts
import { AffiliateConverter, loadConfig } from "linkrelay-mcp";

const converter = new AffiliateConverter(loadConfig());

// Single URL
const result = converter.convertUrl("https://www.amazon.com/dp/B08N5WRWNW");
console.log(result.convertedUrl); // → https://www.amazon.com/dp/B08N5WRWNW?tag=yourname-20

// All URLs inside a block of text
const { convertedText, conversions } = converter.convertLinksInText(myText);
```

---

## API Reference

### `loadConfig(configPath?: string): LinkRelayConfig`

Reads `linkrelay.config.json`, searching from the current working directory up to the filesystem root. Pass an explicit path to override the search.

### `AffiliateConverter`

| Method | Returns | Description |
|---|---|---|
| `convertUrl(url: string)` | `ConversionResult` | Converts a single URL string |
| `convertLinksInText(text: string)` | `TextConversionResult` | Scans text for URLs and converts every eligible one |

### `LinkRelayInterceptor`

Low-level stateful processor for streaming chunk-by-chunk conversion.

| Method | Description |
|---|---|
| `processChunk(chunk: string): string` | Process one delta; buffers partial URLs automatically |
| `flush(): string` | Call once after the last chunk to drain any buffered remainder |

### Stream wrappers

All wrappers return `AsyncGenerator<string>` and handle cross-boundary URLs transparently.

| Export | Input stream type |
|---|---|
| `wrapStream(stream, config)` | `AsyncIterable<string>` |
| `wrapGenericStream(stream, config, extractor)` | `AsyncIterable<T>` |
| `wrapOpenAIStream(stream, config)` | OpenAI chat completion stream |
| `wrapAnthropicStream(stream, config)` | Anthropic messages stream |
| `wrapLangChainStream(stream, config)` | LangChain `BaseMessageChunk` stream |

---

## Development

```bash
npm run build       # compile TypeScript → dist/
npm test            # run all tests
npm run typecheck   # type-check without emitting files
```

---

## Configuration Reference

```jsonc
{
  "stores": {
    // storeId must be one of: amazon | ebay | walmart | bestbuy | target
    "<storeId>": {
      "storeName": "Human-readable name",  // optional
      "enabled": true,                     // set false to skip this store
      "params": {
        // store-specific key/value pairs (see Supported Stores table above)
      }
    }
  }
}
```

---

## License

ISC
