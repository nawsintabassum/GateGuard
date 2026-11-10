import jwt from "jsonwebtoken";
import { env } from "../config/env";
export function signAccessToken(payload: { id: string; email: string; tokenVersion?: number }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}
export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as { id: string; email: string; tokenVersion?: number };
}
