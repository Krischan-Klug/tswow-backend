import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const DevPlugin: ModulePlugin = {
  name: "dev",
  version: "1.0.0",
  description: "Development helpers and diagnostics-only routes.",
  deps: [{ name: "core", range: "^1.0.0" }],
  async init(app, _context) {
    app.use("/dev", routes);
  },
};

export default DevPlugin;
