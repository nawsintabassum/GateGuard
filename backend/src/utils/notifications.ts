import { Notification } from "../models/Notification";
import { User } from "../models/User";
import { decrypt } from "./crypto";

export async function createWorkspaceNotification(input: {
  owner: any; project?: any; type: "quality_gate" | "security" | "coverage" | "analysis" | "pull_request" | "team";
  title: string; message: string; severity?: "info" | "success" | "warning" | "critical"; link?: string;
}) {
  const notification = await Notification.create(input);
  // Slack delivery is best-effort: a failed webhook never blocks CI or webhook processing.
  try {
    const user = await User.findById(input.owner).select("+slackWebhookEncrypted");
    if (user?.slackWebhookEncrypted) {
      const webhook = decrypt(user.slackWebhookEncrypted);
      await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: `*GateGuard · ${input.title}*\n${input.message}` }), signal: AbortSignal.timeout(5000) });
    }
  } catch (error) {
    console.warn("Slack notification delivery failed:", error instanceof Error ? error.message : "unknown error");
  }
  return notification;
}
