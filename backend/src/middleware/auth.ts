import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { User } from "../models/User";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Authentication required" });

  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(payload.id).select("tokenVersion");
    if (!user || (payload.tokenVersion ?? 0) !== user.tokenVersion) {
      return res.status(401).json({ message: "Session is invalid or has expired. Please sign in again." });
    }
    req.user = { id: payload.id, email: payload.email };
    return next();
  } catch (error) {
    return next(error);
  }
}
