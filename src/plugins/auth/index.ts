import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const AuthPlugin: ModulePlugin = {
  name: "auth",
  version: "1.0.0",
  description: "Authentication endpoints and JWT issuing utilities.",
  deps: [{ name: "core", range: "^1.0.0" }],
  async init(app, _context) {
    app.use("/auth", routes);
  },
};

export default AuthPlugin;

// Re-export service layer for external plugin consumption
export * from "./service.js";
