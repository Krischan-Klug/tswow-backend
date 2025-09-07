import { NextFunction, Request, Response } from "express";

/**
 * Generic error handler to ensure consistent JSON responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
}

export default errorHandler;
