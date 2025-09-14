import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const RealmPlugin: ModulePlugin = {
  name: "realm",
  deps: ["core"],
  init(app) {
    app.use("/realm", routes);
  },
};

export default RealmPlugin;

// Re-export service layer for external plugin consumption
export * from "./service.js";
