import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const RealmPlugin: ModulePlugin = {
  name: "realm",
  version: "1.0.0",
  description: "Realm metadata and realm selection endpoints.",
  deps: [{ name: "core", range: "^1.0.0" }],
  async init(app, _context) {
    app.use("/realm", routes);
  },
};

export default RealmPlugin;

// Re-export service layer for external plugin consumption
export * from "./service.js";
