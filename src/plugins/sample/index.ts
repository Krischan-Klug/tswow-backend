import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const SamplePlugin: ModulePlugin = {
  name: "sample",
  version: "1.0.0",
  description: "Example plugin showcasing structure and data access.",
  deps: [
    { name: "core", range: "^1.0.0" },
    { name: "auth", range: "^1.0.0" },
    { name: "realm", range: "^1.0.0" },
  ],
  async init(app, _context) {
    app.use("/sample", routes);
  },
};

export default SamplePlugin;

// Re-export service layer for external plugin consumption
export * from "./service.js";
