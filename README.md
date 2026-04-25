# LinkRelay-MCP

An **MCP (Model Context Protocol) server** that converts product URLs in AI conversations into affiliate links, letting developers earn referral income at no cost to users.

When a user shares a product link from Amazon, eBay, Walmart, Best Buy, or Target, the AI assistant can call `convert_to_affiliate_link` (or `extract_and_convert_links` for bulk text) to obtain the affiliate version before sharing it.

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

## Quick Start

### 1. Install

```bash
git clone https://github.com/Codeprinz-1/LinkRelay-MCP.git
cd LinkRelay-MCP
npm install
npm run build
```

### 2. Configure

Copy `linkrelay.config.json` to your project root (or anywhere in the directory tree above where you run the server) and fill in your affiliate IDs:

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

### 3. Run the server

```bash
npm start
# or directly:
node dist/mcp.js

### `convert_to_affiliate_link`

Converts a single product URL to an affiliate link.

**Input**

| Field | Type   | Description                        |
|-------|--------|------------------------------------|
| `url` | string | The product URL to convert         |

**Output** — JSON object:

```jsonc
{
  "originalUrl": "https://www.amazon.com/dp/B08N5WRWNW",
  "convertedUrl": "https://www.amazon.com/dp/B08N5WRWNW?tag=yourname-20",
  "store": "amazon",
  "converted": true
}
```

### `extract_and_convert_links`

Scans a block of text for product URLs and converts every eligible one.

**Input**

| Field  | Type   | Description                              |
|--------|--------|------------------------------------------|
| `text` | string | Text containing one or more product URLs |

**Output** — JSON object:

```jsonc
{
  "originalText": "...",
  "convertedText": "... (with affiliate URLs substituted in) ...",
  "conversions": [
    {
      "originalUrl": "https://www.amazon.com/dp/B08N5WRWNW",
      "convertedUrl": "https://www.amazon.com/dp/B08N5WRWNW?tag=yourname-20",
      "store": "amazon",
      "converted": true
    }
  ]
}
```

---

## Integrating with Claude Desktop (or another MCP client)

Add the following to your MCP client configuration (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "linkrelay": {
      "command": "node",
      "args": ["/path/to/LinkRelay-MCP/dist/mcp.js"]
    }
  }
}
```

Place your `linkrelay.config.json` in the working directory from which the client launches the server, or anywhere in the directory tree above it.

---

## Using as a Library (Streaming API)

LinkRelay can also be used directly in any Node.js, edge, or browser project to intercept LLM streaming responses and rewrite affiliate links on the fly.

```bash
npm install linkrelay-mcp
```

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

URLs split across chunk boundaries are automatically buffered and reassembled, so conversions are always accurate regardless of where the provider splits its output.

---

## Development

```bash
npm run build       # compile TypeScript → dist/
npm test            # run all tests
npm run typecheck   # type-check without emitting files
```

---

## Configuration Reference

`linkrelay.config.json` lives next to your project (or in any parent directory).

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
