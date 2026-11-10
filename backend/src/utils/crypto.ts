import crypto from "crypto";
import { env } from "../config/env";
const key = () => {
  const value = env.TOKEN_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error("TOKEN_ENCRYPTION_KEY must be 64 hex characters");
  return Buffer.from(value, "hex");
};
export function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}
export function decrypt(value: string) {
  const [ivHex, tagHex, dataHex] = value.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("hex");
