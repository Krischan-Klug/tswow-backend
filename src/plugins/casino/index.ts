import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const CasinoPlugin: ModulePlugin = {
  name: "casino",
  version: "1.0.0",
  description: "Casino plugin offering gold-based wagers for characters.",
  deps: [
    { name: "core", range: "^1.0.0" },
    { name: "auth", range: "^1.0.0" },
    { name: "character", range: "^1.0.0" },
    { name: "realm", range: "^1.0.0" },
  ],
  async init(app, _context) {
    app.use("/casino", routes);
  },
};

export default CasinoPlugin;

export * from "./service.js";

