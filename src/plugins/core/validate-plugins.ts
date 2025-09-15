import path from "node:path";
import { fileURLToPath } from "node:url";
import { stderr, stdout } from "node:process";
import { planPlugins } from "../index.js";

function formatList(label: string, items: string[]): void {
  if (items.length === 0) {
    return;
  }
  stdout.write(`${label}: ${items.join(", ")}` + "\n");
}

function formatIssues(issues: string[]): void {
  if (issues.length === 0) {
    return;
  }
  stderr.write(
    "Plugin issues detected:\n" + issues.map((issue) => ` - ${issue}`).join("\n") + "\n"
  );
}

function warnStale(entries: string[]): void {
  if (entries.length === 0) {
    return;
  }
  stderr.write(
    `Warning: configuration contains unknown plugins: ${entries.join(", ")}` + "\n"
  );
}

export async function runPluginValidation(): Promise<number> {
  try {
    const { plan, staleConfigEntries } = await planPlugins();
    const enabled: string[] = [];
    const disabled: string[] = [];
    const skipped: string[] = [];
    const issues: string[] = [];

    for (const entry of plan) {
      const ident = `${entry.name}@${entry.version}`;
      switch (entry.status) {
        case "enabled":
          enabled.push(ident);
          break;
        case "disabled":
          disabled.push(ident);
          break;
        case "skipped":
          skipped.push(ident);
          break;
      }
      if (entry.issues.length) {
        issues.push(`${ident}: ${entry.issues.join("; ")}`);
      }
    }

    stdout.write(`Discovered ${plan.length} plugin(s).` + "\n");
    formatList("Enabled", enabled);
    formatList("Disabled", disabled);
    formatList("Skipped", skipped);
    warnStale(staleConfigEntries);
    formatIssues(issues);

    return issues.length > 0 ? 1 : 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderr.write(`Plugin validation failed: ${message}\n`);
    return 1;
  }
}

async function runCli(): Promise<void> {
  const exitCode = await runPluginValidation();
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

const thisFile = path.resolve(fileURLToPath(import.meta.url));
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : undefined;

if (invoked && thisFile === invoked) {
  runCli().catch((err) => {
    stderr.write(`Plugin validation crashed: ${String(err)}\n`);
    process.exit(1);
  });
}
