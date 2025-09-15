import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const CharacterPlugin: ModulePlugin = {
  name: "character",
  deps: ["core", "auth"],
  init(app) {
    app.use("/character", routes);
  },
};

export default CharacterPlugin;

// Re-export service layer for external plugin consumption
export * from "./service.js";
