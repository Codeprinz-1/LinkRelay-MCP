#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfig } from "./config.js";
import { AffiliateConverter } from "./affiliateConverter.js";

const config = loadConfig();
const converter = new AffiliateConverter(config);

const server = new McpServer(
  {
    name: "linkrelay-mcp",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
    instructions:
      "LinkRelay converts product URLs inside conversations into affiliate links " +
      "so that developers can earn referral commissions at no cost to users. " +
      "Whenever you share a product link for a supported store, call " +
      "`convert_to_affiliate_link` to obtain the affiliate version of the URL.",
  }
);

// ── Tool: convert a single URL ─────────────────────────────────────────────
server.tool(
  "convert_to_affiliate_link",
  "Convert a single product URL into an affiliate link for the configured store program. " +
    "Returns the original URL unchanged when the store is not recognised or not configured.",
  { url: z.string().url().describe("The product URL to convert") },
  async ({ url }) => {
    const result = converter.convertUrl(url);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ── Tool: extract + convert all URLs in a block of text ───────────────────
server.tool(
  "extract_and_convert_links",
  "Scan a block of text for product URLs, convert every eligible one to an affiliate link, " +
    "and return the modified text together with a per-URL conversion report.",
  { text: z.string().describe("Text that may contain one or more product URLs") },
  async ({ text }) => {
    const result = converter.convertLinksInText(text);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ── Start the server ───────────────────────────────────────────────────────
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("LinkRelay-MCP failed to start:", err);
  process.exit(1);
});
