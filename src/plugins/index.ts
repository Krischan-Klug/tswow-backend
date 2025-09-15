import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import semver from "semver";
import type {
  ModulePlugin,
  PluginDependency,
  PluginLifecycleContext,
  PluginSummary,
} from "./types.js";

const CONFIG_FILE = path.resolve(process.cwd(), "plugins.config.json");
const LEGACY_CONFIG_FILE = path.resolve(process.cwd(), "plugins.json");
const pluginsDir = fileURLToPath(new URL("./", import.meta.url));

const CORE_PLUGIN_NAME = "core";

const DEV_LIFECYCLE = process.env.npm_lifecycle_event === "dev";
const AUTO_SCAFFOLD_ENV = process.env.TSWOW_PLUGIN_AUTO_SCAFFOLD ?? "";
const AUTO_SCAFFOLD_ENABLED =
  DEV_LIFECYCLE ||
  AUTO_SCAFFOLD_ENV.toLowerCase() === "1" ||
  AUTO_SCAFFOLD_ENV.toLowerCase() === "true";

let scaffoldWatcherStarted = false;

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function writeFileSafe(target: string, content: string): void {
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, content, "utf8");
  }
}

function maybeScaffoldPluginDirectory(pluginName: string): void {
  if (!AUTO_SCAFFOLD_ENABLED) {
    return;
  }
  const normalized = pluginName.trim();
  if (!normalized) {
    return;
  }
  const pluginPath = path.join(pluginsDir, normalized);
  if (!fs.existsSync(pluginPath) || !fs.statSync(pluginPath).isDirectory()) {
    return;
  }
  const indexPath = path.join(pluginPath, "index.ts");
  const indexJsPath = path.join(pluginPath, "index.js");
  if (fs.existsSync(indexPath) || fs.existsSync(indexJsPath)) {
    return;
  }

  const pascal = toPascalCase(normalized) || "Plugin";
  const pluginConst = `${pascal}Plugin`;
  const routeHandler = `get${pascal}`;
  const serviceFn = `get${pascal}Data`;
  const description = `Auto-generated plugin '${normalized}'.`;

  writeFileSafe(
    indexPath,
    `import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const ${pluginConst}: ModulePlugin = {
  name: "${normalized}",
  version: "0.1.0",
  description: "${description}",
  deps: [{ name: "core", range: "^1.0.0" }],
  async init(app, _context) {
    app.use("/${normalized}", routes);
  },
};

export default ${pluginConst};

export * from "./service.js";
`
  );

  writeFileSafe(
    path.join(pluginPath, "routes.ts"),
    `import { Router } from "express";
import { requireAuth } from "plugin-core";
import { ${routeHandler} } from "./controller.js";

const router = Router();

router.get("/", requireAuth, ${routeHandler});

export default router;
`
  );

  writeFileSafe(
    path.join(pluginPath, "controller.ts"),
    `import type { Response } from "express";
import type { AuthRequest } from "plugin-core";
import { ${serviceFn} } from "./service.js";

export async function ${routeHandler}(req: AuthRequest, res: Response): Promise<Response> {
  const result = await ${serviceFn}(req.user?.id ?? null);
  return res.json(result);
}
`
  );

  writeFileSafe(
    path.join(pluginPath, "service.ts"),
    `export interface ${pascal}Data {
  message: string;
  accountId: number | null;
}

export async function ${serviceFn}(accountId: number | null): Promise<${pascal}Data> {
  return {
    message: "Hello from ${normalized}!",
    accountId,
  };
}
`
  );

  console.log(
    `Auto-scaffolded plugin '${normalized}' with starter files (index.ts, routes.ts, controller.ts, service.ts).`
  );
}

function startPluginScaffoldWatcher(): void {
  if (!AUTO_SCAFFOLD_ENABLED || scaffoldWatcherStarted) {
    return;
  }
  scaffoldWatcherStarted = true;

  try {
    const watcher = fs.watch(pluginsDir, { persistent: true }, (eventType, entry) => {
      if (eventType !== "rename" || !entry) {
        return;
      }
      const pluginName = entry.toString();
      setTimeout(() => {
        try {
          maybeScaffoldPluginDirectory(pluginName);
        } catch (err) {
          console.error(`Failed to scaffold plugin '${pluginName}':`, err);
        }
      }, 50);
    });

    watcher.on("error", (err) => {
      console.error("Plugin scaffolder watcher error:", err);
    });
  } catch (err) {
    console.error("Failed to initialize plugin scaffolder watcher:", err);
  }
}

if (AUTO_SCAFFOLD_ENABLED) {
  startPluginScaffoldWatcher();
}

type NormalizedDependency = PluginDependency;

interface PluginInfo {
  mod: ModulePlugin;
  deps: NormalizedDependency[];
  version: string;
  description?: string;
}

interface PluginConfigEntry {
  enabled: boolean;
  settings: Record<string, unknown>;
}

type PluginConfig = Record<string, PluginConfigEntry>;

export interface PluginPlan {
  name: string;
  version: string;
  description?: string;
  status: "enabled" | "disabled" | "skipped";
  issues: string[];
  dependencies: NormalizedDependency[];
  resolvedDependencies: string[];
  settings: Record<string, unknown>;
}

interface InternalPlanEntry {
  name: string;
  info: PluginInfo;
  config: PluginConfigEntry;
  plan: PluginPlan;
}

interface PluginAnalysis {
  entries: InternalPlanEntry[];
  registry: Record<string, PluginSummary>;
  staleConfigEntries: string[];
}

function cloneDependency(dep: PluginDependency): NormalizedDependency {
  return dep.range ? { name: dep.name, range: dep.range } : { name: dep.name };
}

function normalizeDependency(
  dep: PluginDependency,
  pluginName: string,
  index: number
): NormalizedDependency {
  if (!dep || typeof dep !== "object") {
    throw new Error(
      `Invalid dependency definition at index ${index} in plugin '${pluginName}'.`
    );
  }
  const { name, range } = dep;
  if (!name || typeof name !== "string") {
    throw new Error(
      `Dependency #${index + 1} in plugin '${pluginName}' is missing a valid name.`
    );
  }
  if (
    range !== undefined &&
    (typeof range !== "string" || !semver.validRange(range, { loose: true }))
  ) {
    throw new Error(
      `Dependency '${name}' in plugin '${pluginName}' has an invalid semver range '${range}'.`
    );
  }
  return range ? { name, range } : { name };
}

async function discoverPlugins(): Promise<Record<string, PluginInfo>> {
  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const plugins: Record<string, PluginInfo> = {};

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    maybeScaffoldPluginDirectory(entry.name);

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
    const plugin = mod.default as ModulePlugin | undefined;

    if (!plugin) {
      continue;
    }

    if (!plugin.name || typeof plugin.name !== "string") {
      throw new Error(`Plugin '${entry.name}' is missing a valid name.`);
    }

    if (!plugin.version || typeof plugin.version !== "string") {
      throw new Error(`Plugin '${plugin.name}' must declare a version.`);
    }

    if (!semver.valid(plugin.version, { loose: true })) {
      throw new Error(
        `Plugin '${plugin.name}' has an invalid semver version '${plugin.version}'.`
      );
    }

    const depsArray = plugin.deps ?? [];
    if (!Array.isArray(depsArray)) {
      throw new Error(`Plugin '${plugin.name}' deps must be an array.`);
    }
    const deps = depsArray.map((dep, index) =>
      normalizeDependency(dep, plugin.name, index)
    );

    plugins[plugin.name] = {
      mod: plugin,
      deps,
      version: plugin.version,
      description: plugin.description,
    };
  }

  if (!(CORE_PLUGIN_NAME in plugins)) {
    throw new Error(`Required plugin '${CORE_PLUGIN_NAME}' was not discovered.`);
  }
  return plugins;
}

function topoSort(plugins: Record<string, PluginInfo>): string[] {
  const inDeg: Record<string, number> = {};
  const graph: Record<string, string[]> = {};

  for (const [name, info] of Object.entries(plugins)) {
    inDeg[name] = inDeg[name] ?? 0;
    for (const dep of info.deps) {
      if (!(dep.name in plugins)) {
        continue;
      }
      graph[dep.name] = graph[dep.name] || [];
      graph[dep.name].push(name);
      inDeg[name] = (inDeg[name] || 0) + 1;
    }
  }

  const queue = Object.keys(plugins).filter((n) => inDeg[n] === 0);
  const order: string[] = [];

  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const m of graph[n] || []) {
      inDeg[m] -= 1;
      if (inDeg[m] === 0) {
        queue.push(m);
      }
    }
  }

  if (order.length !== Object.keys(plugins).length) {
    throw new Error("Circular plugin dependency detected");
  }

  return order;
}

function normalizeConfigEntry(entry: unknown): PluginConfigEntry {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return { enabled: true, settings: {} };
  }
  const record = entry as Partial<PluginConfigEntry> & Record<string, unknown>;
  const enabled =
    typeof record.enabled === "boolean" ? record.enabled : true;
  const settings =
    record.settings && typeof record.settings === "object" && !Array.isArray(record.settings)
      ? (record.settings as Record<string, unknown>)
      : {};
  return {
    enabled,
    settings,
  };
}

function loadConfig(pluginNames: string[]): PluginConfig {
  let config: PluginConfig = {};
  let shouldWrite = false;

  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [name, value] of Object.entries(parsed)) {
      config[name] = normalizeConfigEntry(value);
    }
  } else if (fs.existsSync(LEGACY_CONFIG_FILE)) {
    const rawLegacy = fs.readFileSync(LEGACY_CONFIG_FILE, "utf8");
    const legacy = JSON.parse(rawLegacy) as Record<string, boolean>;
    for (const [name, enabled] of Object.entries(legacy)) {
      config[name] = {
        enabled: Boolean(enabled),
        settings: {},
      };
    }
    shouldWrite = true;
  }

  for (const name of pluginNames) {
    if (!(name in config)) {
      config[name] = {
        enabled: true,
        settings: {},
      };
      shouldWrite = true;
    } else if (!config[name].settings) {
      config[name].settings = {};
    }
  }

  if (shouldWrite || !fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  }

  return config;
}

function cloneSettings(settings: Record<string, unknown>): Record<string, unknown> {
  if (!settings || typeof settings !== "object") {
    return {};
  }
  return JSON.parse(JSON.stringify(settings));
}

function buildRegistry(plugins: Record<string, PluginInfo>): Record<string, PluginSummary> {
  const registry: Record<string, PluginSummary> = {};
  for (const [name, info] of Object.entries(plugins)) {
    registry[name] = {
      name,
      version: info.version,
      description: info.description,
    };
  }
  return registry;
}

function preparePlan(
  plugins: Record<string, PluginInfo>,
  config: PluginConfig,
  order: string[]
): PluginAnalysis {
  const entries: InternalPlanEntry[] = [];
  const registry = buildRegistry(plugins);
  const loaded = new Set<string>();
  const staleConfigEntries = Object.keys(config).filter((name) => !(name in plugins));

  for (const name of order) {
    const info = plugins[name];
    const configEntry = config[name] ?? { enabled: true, settings: {} };
    const issues: string[] = [];
    const resolvedDependencies: string[] = [];

    for (const dep of info.deps) {
      if (!(dep.name in plugins)) {
        issues.push(`Unknown dependency '${dep.name}'`);
        continue;
      }
      if (!loaded.has(dep.name)) {
        issues.push(`Missing dependency '${dep.name}'`);
        continue;
      }
      resolvedDependencies.push(dep.name);
      if (dep.range) {
        const depVersion = plugins[dep.name].version;
        if (!semver.satisfies(depVersion, dep.range, { includePrerelease: true })) {
          issues.push(
            `Dependency '${dep.name}' version ${depVersion} does not satisfy range '${dep.range}'`
          );
        }
      }
    }

    let status: PluginPlan["status"] = "enabled";
    if (!configEntry.enabled) {
      status = "disabled";
    } else if (issues.length > 0) {
      status = "skipped";
    }

    if (status === "enabled") {
      loaded.add(name);
    }

    const plan: PluginPlan = {
      name,
      version: info.version,
      description: info.description,
      status,
      issues,
      dependencies: info.deps.map(cloneDependency),
      resolvedDependencies,
      settings: cloneSettings(configEntry.settings ?? {}),
    };

    entries.push({
      name,
      info,
      config: {
        enabled: configEntry.enabled,
        settings: cloneSettings(configEntry.settings ?? {}),
      },
      plan,
    });
  }

  return { entries, registry, staleConfigEntries };
}

async function preparePlugins(): Promise<PluginAnalysis> {
  const plugins = await discoverPlugins();
  const names = Object.keys(plugins);
  const config = loadConfig(names);
  const order = topoSort(plugins);
  const analysis = preparePlan(plugins, config, order);

  const coreEntry = analysis.entries.find((entry) => entry.name === CORE_PLUGIN_NAME);
  if (!coreEntry) {
    throw new Error(
      `Required plugin '${CORE_PLUGIN_NAME}' was not registered during planning.`
    );
  }

  if (coreEntry.plan.status !== "enabled") {
    const reason =
      coreEntry.plan.status === "disabled"
        ? "it is disabled in plugins.config.json"
        : coreEntry.plan.issues.length
        ? coreEntry.plan.issues.join("; ")
        : "unresolved issues";
    throw new Error(
      `Required plugin '${CORE_PLUGIN_NAME}' must be enabled before the server can start: ${reason}.`
    );
  }

  return analysis;
}

export async function planPlugins(): Promise<{
  plan: PluginPlan[];
  staleConfigEntries: string[];
}> {
  const analysis = await preparePlugins();
  return {
    plan: analysis.entries.map((entry) => entry.plan),
    staleConfigEntries: analysis.staleConfigEntries,
  };
}

function buildContext(
  analysis: PluginAnalysis,
  current: InternalPlanEntry
): PluginLifecycleContext {
  const settings = cloneSettings(current.config.settings);
  const resolved: Record<string, PluginSummary> = {};

  for (const depName of current.plan.resolvedDependencies) {
    const summary = analysis.registry[depName];
    if (summary) {
      resolved[depName] = summary;
    }
  }

  return {
    settings,
    registry: analysis.registry,
    resolvedDependencies: resolved,
  };
}

export default async function initPlugins(app: Express): Promise<void> {
  const analysis = await preparePlugins();

  const enabled: string[] = [];
  const disabled: string[] = [];
  const skipped: InternalPlanEntry[] = [];

  if (analysis.staleConfigEntries.length) {
    console.warn(
      "Found configuration entries for unknown plugins:",
      analysis.staleConfigEntries.join(", ")
    );
  }

  for (const entry of analysis.entries) {
    const { plan, info } = entry;
    if (plan.status === "disabled") {
      disabled.push(plan.name);
      continue;
    }
    if (plan.status === "skipped") {
      skipped.push(entry);
      continue;
    }

    const context = buildContext(analysis, entry);

    if (typeof info.mod.beforeInit === "function") {
      await info.mod.beforeInit(app, context);
    }

    await info.mod.init(app, context);

    if (typeof info.mod.afterInit === "function") {
      await info.mod.afterInit(app, context);
    }

    enabled.push(plan.name);
  }

  const total = analysis.entries.length;
  console.log(`Plugins loaded: ${enabled.length} / ${total}`);

  if (enabled.length) {
    const formatted = enabled
      .map((name) => {
        const summary = analysis.registry[name];
        return summary ? `${summary.name}@${summary.version}` : name;
      })
      .join(", ");
    console.log("\x1b[32m%s\x1b[0m", "Plugins enabled:", formatted);
  }

  if (disabled.length) {
    console.log("\x1b[33m%s\x1b[0m", "Plugins disabled:", disabled.join(", "));
  }

  if (skipped.length) {
    const messages = skipped
      .map((entry) => {
        const summary = analysis.registry[entry.name];
        const versionInfo = summary ? `@${summary.version}` : "";
        return `${entry.name}${versionInfo} -> ${entry.plan.issues.join("; ")}`;
      })
      .join("; ");
    console.log(
      "\x1b[31m%s\x1b[0m",
      "Plugins skipped (dependency issues):",
      messages
    );
  }
}



