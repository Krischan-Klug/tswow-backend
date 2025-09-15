import type { Request, Response } from "express";

export function showDev(req: Request, res: Response) {
  console.log("DEV ACCESSED");
  return res.send({ message: "DEV ACCESSED" });
}
