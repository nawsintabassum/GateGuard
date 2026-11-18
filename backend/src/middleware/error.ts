import { Request, Response, NextFunction } from "express";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: "Route not found" });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err?.name === "ZodError") return res.status(400).json({ message: "Validation failed", errors: err.issues });
  if (err?.code === 11000) return res.status(409).json({ message: "A record with this value already exists" });
  if (err?.name === "ValidationError" || err?.name === "CastError") {
    return res.status(400).json({ message: "Invalid request data" });
  }
  const status = Number(err?.statusCode) || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? "Internal server error" : err.message });
}
