import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const SamplePlugin: ModulePlugin = {
  name: "sample",
  deps: ["core", "auth", "realm"],
  init(app) {
    app.use("/sample", routes);
  },
};

export default SamplePlugin;

// Re-export service layer for external plugin consumption
export * from "./service.js";
