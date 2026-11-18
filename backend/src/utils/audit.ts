import { AuditLog } from "../models/AuditLog";
export async function recordAudit(input: { owner: any; project: any; actor?: any; actorLabel: string; action: string; details: string }) {
  return AuditLog.create(input);
}
