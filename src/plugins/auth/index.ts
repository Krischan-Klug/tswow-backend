import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const AuthPlugin: ModulePlugin = {
  name: "auth",
  deps: ["core"],
  init(app) {
    app.use("/auth", routes);
  },
};

export default AuthPlugin;

// Re-export service layer for external plugin consumption
export * from "./service.js";
