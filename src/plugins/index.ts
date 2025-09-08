import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import type { ModulePlugin } from "./types.js";

const CONFIG_FILE = path.resolve(process.cwd(), "plugins.json");
const pluginsDir = fileURLToPath(new URL("./", import.meta.url));

interface PluginInfo {
  mod: ModulePlugin;
  deps: string[];
}

async function discoverPlugins(): Promise<Record<string, PluginInfo>> {
  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const plugins: Record<string, PluginInfo> = {};
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const pkgFile = path.join(pluginsDir, entry.name, "package.json");
    if (!fs.existsSync(pkgFile)) {
      continue;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8")) as {
      name?: string;
      dependencies?: Record<string, string>;
    };
    if (!pkg.name) {
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
    plugins[pkg.name] = {
      mod: mod.default as ModulePlugin,
      deps: Object.keys(pkg.dependencies || {}),
    };
  }
  return plugins;
}

function topoSort(plugins: Record<string, PluginInfo>): string[] {
  const inDeg: Record<string, number> = {};
  const graph: Record<string, string[]> = {};
  for (const [name, info] of Object.entries(plugins)) {
    inDeg[name] = inDeg[name] ?? 0;
    for (const dep of info.deps) {
      if (!(dep in plugins)) {
        continue;
      }
      graph[dep] = graph[dep] || [];
      graph[dep].push(name);
      inDeg[name] = (inDeg[name] || 0) + 1;
    }
  }
  const queue = Object.keys(plugins).filter((n) => inDeg[n] === 0);
  const order: string[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const m of graph[n] || []) {
      inDeg[m]--;
      if (inDeg[m] === 0) queue.push(m);
    }
  }
  if (order.length !== Object.keys(plugins).length) {
    throw new Error("Circular plugin dependency detected");
  }
  return order;
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
  const order = topoSort(plugins);
  const enabledPlugins: string[] = [];
  const skippedPlugins: Record<string, string[]> = {};
  const loaded = new Set<string>();
  for (const name of order) {
    if (!config[name]) {
      continue;
    }
    const missingDeps = plugins[name].deps.filter((dep) => !loaded.has(dep));
    if (missingDeps.length) {
      skippedPlugins[name] = missingDeps;
      console.log(
        `Skipping plugin '${name}' due to missing dependencies: ${missingDeps.join(", ")}`
      );
      continue;
    }
    plugins[name].mod.init(app);
    enabledPlugins.push(name);
    loaded.add(name);
  }
  console.log("Plugins loaded:", enabledPlugins.length, "/", order.length);
  console.log(
    "\x1b[32m%s\x1b[0m",
    "Plugins enabled:",
    enabledPlugins.join(", ")
  );
  const disabledPlugins = order.filter((n) => !config[n]);
  if (disabledPlugins.length)
    console.log(
      "\x1b[31m%s\x1b[0m",
      "Plugins disabled:",
      disabledPlugins.join(", ")
    );
  const depDisabled = Object.keys(skippedPlugins);
  if (depDisabled.length)
    console.log(
      "\x1b[31m%s\x1b[0m",
      "Plugins skipped (missing deps):",
      depDisabled.map((n) => `${n} -> ${skippedPlugins[n].join(", ")}`).join("; ")
    );
}
