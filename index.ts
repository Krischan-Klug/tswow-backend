import dotenv from "dotenv";
dotenv.config({ quiet: true });

import { createServer } from "http";
import app from "./src/app.js";

const port: number = Number(process.env.PORT ?? 3001);
createServer(app).listen(port, () => {
  console.log(`Backend listening on http://127.0.0.1:${port}`);
});
