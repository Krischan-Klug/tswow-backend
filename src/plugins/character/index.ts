import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const CharacterPlugin: ModulePlugin = {
  name: "character",
  version: "1.0.0",
  description: "Character listings and data sourced from realm databases.",
  deps: [
    { name: "core", range: "^1.0.0" },
    { name: "auth", range: "^1.0.0" },
    { name: "realm", range: "^1.0.0" },
  ],
  async init(app, _context) {
    app.use("/character", routes);
  },
};

export default CharacterPlugin;

// Re-export service layer for external plugin consumption
export * from "./service.js";
export * from "./types.js";
