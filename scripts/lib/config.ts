/** Shared reader for `config/environments.json`. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DeployableEnvironment } from "@seldon/foundation";

export interface EnvironmentConfig {
  zone: string;
  consoleHostname: string;
  apiHostname: string;
  accessTeamDomain: string;
}

export interface SeldonConfig {
  compatibilityDate: string;
  compatibilityFlags: string[];
  environments: Record<DeployableEnvironment, EnvironmentConfig>;
}

export const REPO_ROOT = new URL("../../", import.meta.url).pathname;

export function loadConfig(): SeldonConfig {
  const raw = readFileSync(join(REPO_ROOT, "config/environments.json"), "utf8");
  return JSON.parse(raw) as SeldonConfig;
}

/** Hostnames still on the reserved .example TLD are not deployable. */
export function isPlaceholder(config: EnvironmentConfig): boolean {
  return [config.zone, config.consoleHostname, config.apiHostname].some(
    (value) => value.endsWith(".example"),
  );
}

/** Strip `//` and `/* *​/` comments so JSONC parses as JSON. */
export function parseJsonc<T>(source: string): T {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i] ?? "";
    const next = source[i + 1] ?? "";
    if (inLine) {
      if (char === "\n") {
        inLine = false;
        out += char;
      }
      continue;
    }
    if (inBlock) {
      if (char === "*" && next === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += char;
      if (char === "\\") {
        out += next;
        i++;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === "/" && next === "/") {
      inLine = true;
      i++;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlock = true;
      i++;
      continue;
    }
    out += char;
  }
  return JSON.parse(out) as T;
}
