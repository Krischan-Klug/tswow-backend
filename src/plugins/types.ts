import type { Express } from "express";

export interface ModulePlugin {
  name: string;
  // Optional list of other plugin names this plugin depends on
  deps?: string[];
  init(app: Express): void;
}
