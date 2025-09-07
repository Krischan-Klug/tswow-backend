import type { Express } from "express";

export interface ModulePlugin {
  name: string;
  init(app: Express): void;
}
