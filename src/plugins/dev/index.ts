import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const DevPlugin: ModulePlugin = {
  name: "dev",
  init(app) {
    app.use("/dev", routes);
  },
};

export default DevPlugin;
