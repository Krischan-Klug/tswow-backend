import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import type { ModulePlugin } from "./types.js";

const CONFIG_FILE = path.resolve(process.cwd(), "plugins.json");
const pluginsDir = fileURLToPath(new URL("./", import.meta.url));

async function discoverPlugins(): Promise<Record<string, ModulePlugin>> {
  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const plugins: Record<string, ModulePlugin> = {};
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexFile = path.join(pluginsDir, entry.name, "index.js");
      if (fs.existsSync(indexFile)) {
        const mod = await import(`./${entry.name}/index.js`);
        plugins[entry.name] = mod.default as ModulePlugin;
      }
    }
  }
  return plugins;
}

function loadConfig(pluginNames: string[]): Record<string, boolean> {
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaults: Record<string, boolean> = {};
    for (const name of pluginNames) {
      defaults[name] = true;
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2), "utf8");
    return defaults;
  }
  const raw = fs.readFileSync(CONFIG_FILE, "utf8");
  return JSON.parse(raw) as Record<string, boolean>;
}

export default async function initPlugins(app: Express): Promise<void> {
  const plugins = await discoverPlugins();
  const config = loadConfig(Object.keys(plugins));
  for (const [name, plugin] of Object.entries(plugins)) {
    if (config[name]) {
      plugin.init(app);
    }
  }
}

