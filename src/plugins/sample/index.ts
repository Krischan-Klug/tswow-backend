import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const SamplePlugin: ModulePlugin = {
  name: "sample",
  deps: ["auth"],
  init(app) {
    app.use("/sample", routes);
  },
};

export default SamplePlugin;
