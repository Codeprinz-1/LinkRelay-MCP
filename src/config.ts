import * as fs from "fs";
import * as path from "path";
import type { LinkRelayConfig } from "./types.js";

const CONFIG_FILENAME = "linkrelay.config.json";

/**
 * Searches for linkrelay.config.json starting from the current working
 * directory and walking up to the filesystem root.  Falls back to a
 * built-in default (all stores disabled) when the file is not found.
 */
export function loadConfig(configPath?: string): LinkRelayConfig {
  const filePath = configPath ?? findConfigFile();

  if (filePath && fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<LinkRelayConfig>;
      return normalise(parsed);
    } catch (err) {
      throw new Error(
        `Failed to parse ${filePath}: ${(err as Error).message}`
      );
    }
  }

  return defaultConfig();
}

function findConfigFile(): string | null {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, CONFIG_FILENAME);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Fill in any missing optional fields so the rest of the code can rely on them. */
function normalise(raw: Partial<LinkRelayConfig>): LinkRelayConfig {
  const stores: LinkRelayConfig["stores"] = {};
  for (const [id, entry] of Object.entries(raw.stores ?? {})) {
    stores[id] = {
      storeName: entry.storeName ?? id,
      params: entry.params ?? {},
      enabled: entry.enabled !== false, // default true when key is present
    };
  }
  return { stores };
}

function defaultConfig(): LinkRelayConfig {
  return { stores: {} };
}
