import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const AuthPlugin: ModulePlugin = {
  name: "auth",
  init(app) {
    app.use("/auth", routes);
  },
};

export default AuthPlugin;
