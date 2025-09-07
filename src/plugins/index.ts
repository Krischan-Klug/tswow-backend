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
    if (!entry.isDirectory()) {
      continue;
    }

    const base = path.join(pluginsDir, entry.name, "index");
    let ext = "";
    if (fs.existsSync(`${base}.js`)) {
      ext = ".js";
    } else if (fs.existsSync(`${base}.ts`)) {
      ext = ".ts";
    } else {
      continue;
    }

    const mod = await import(`./${entry.name}/index${ext}`);
    plugins[entry.name] = mod.default as ModulePlugin;
  }
  return plugins;
}

function loadConfig(pluginNames: string[]): Record<string, boolean> {
  let config: Record<string, boolean> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    config = JSON.parse(raw) as Record<string, boolean>;
  }

  let updated = false;
  for (const name of pluginNames) {
    if (!(name in config)) {
      config[name] = true;
      updated = true;
    }
  }

  if (!fs.existsSync(CONFIG_FILE) || updated) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  }

  return config;
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

