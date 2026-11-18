import { Request, Response } from "express";
import { z } from "zod";
import { Project } from "../models/Project";
import { ProjectMember } from "../models/ProjectMember";
import { Notification } from "../models/Notification";
import { canManageProject, canAdminProject, accessibleProjectIds } from "../utils/projectAccess";
import { createWorkspaceNotification } from "../utils/notifications";
import { User } from "../models/User";
import { encrypt } from "../utils/crypto";
import { QualityRule } from "../models/QualityRule";
import { AuditLog } from "../models/AuditLog";
import { recordAudit } from "../utils/audit";

const templates = {
  startup: { label: "Startup", description: "Balanced guardrails for fast-moving teams.", minCoverage: 65, minTestPassRate: 90, maxEslintErrors: 10, maxCriticalVulnerabilities: 0, maxHighVulnerabilities: 2 },
  enterprise: { label: "Enterprise", description: "Strict release standards for production systems.", minCoverage: 85, minTestPassRate: 99, maxEslintErrors: 0, maxCriticalVulnerabilities: 0, maxHighVulnerabilities: 0 },
  security: { label: "Security-focused", description: "Prioritizes zero critical or high dependency risk.", minCoverage: 75, minTestPassRate: 95, maxEslintErrors: 0, maxCriticalVulnerabilities: 0, maxHighVulnerabilities: 0 },
  testing: { label: "Testing-focused", description: "Emphasizes reliable automated test coverage.", minCoverage: 90, minTestPassRate: 99, maxEslintErrors: 5, maxCriticalVulnerabilities: 0, maxHighVulnerabilities: 1 }
};

async function managedProject(projectId: string, userId: string) {
  if (!await canManageProject(projectId, userId)) return null;
  return Project.findById(projectId).select("_id owner");
}
async function adminProject(projectId: string, userId: string) {
  if (!await canAdminProject(projectId, userId)) return null;
  return Project.findById(projectId).select("_id owner");
}

export async function listMembers(req: Request, res: Response) {
  if (!await adminProject(req.params.projectId, req.user!.id)) return res.status(404).json({ message: "Project not found" });
  const members = await ProjectMember.find({ project: req.params.projectId }).sort({ createdAt: 1 }).lean();
  return res.json({ members, roles: ["admin", "manager", "developer", "viewer"] });
}
export async function inviteMember(req: Request, res: Response) {
  if (!await adminProject(req.params.projectId, req.user!.id)) return res.status(404).json({ message: "Project not found" });
  const input = z.object({ email: z.string().email().max(254), role: z.enum(["admin", "manager", "developer", "viewer"]) }).parse(req.body);
  const invitedUser = await User.findOne({ email: input.email.toLowerCase() }).select("_id");
  const project = await Project.findById(req.params.projectId).select("owner");
  const member = await ProjectMember.findOneAndUpdate(
    { project: req.params.projectId, email: input.email.toLowerCase() },
    { $set: { user: invitedUser?._id, role: input.role, status: invitedUser ? "active" : "invited", invitedBy: req.user!.id, owner: project!.owner } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await createWorkspaceNotification({ owner: String(project!.owner), project: req.params.projectId, type: "team", title: "Team invitation created", message: `${input.email} was ${invitedUser ? "added to the project" : "invited"} as ${input.role}. ${invitedUser ? "Their account now has project access." : "They must create an account with this email; automatic email delivery is not configured."}`, severity: "info" });
  await recordAudit({ owner: project!.owner, project: req.params.projectId, actor: req.user!.id, actorLabel: req.user!.email, action: "team.member_invited", details: `${input.email} assigned ${input.role}` });
  return res.status(201).json({ member });
}
export async function updateMember(req: Request, res: Response) {
  if (!await adminProject(req.params.projectId, req.user!.id)) return res.status(404).json({ message: "Project not found" });
  const role = z.enum(["admin", "manager", "developer", "viewer"]).parse(req.body.role);
  const member = await ProjectMember.findOneAndUpdate({ _id: req.params.memberId, project: req.params.projectId }, { role }, { new: true, runValidators: true });
  if (!member) return res.status(404).json({ message: "Team member not found" });
  await recordAudit({ owner: member.owner, project: req.params.projectId, actor: req.user!.id, actorLabel: req.user!.email, action: "team.role_changed", details: `${member.email} role changed to ${role}` });
  return res.json({ member });
}
export async function removeMember(req: Request, res: Response) {
  if (!await adminProject(req.params.projectId, req.user!.id)) return res.status(404).json({ message: "Project not found" });
  const member = await ProjectMember.findOneAndDelete({ _id: req.params.memberId, project: req.params.projectId });
  if (!member) return res.status(404).json({ message: "Team member not found" });
  await recordAudit({ owner: member.owner, project: req.params.projectId, actor: req.user!.id, actorLabel: req.user!.email, action: "team.member_removed", details: `${member.email} removed from project` });
  return res.json({ message: "Team member removed" });
}
export async function listNotifications(req: Request, res: Response) {
  const projectIds = await accessibleProjectIds(req.user!.id);
  const scope = { $or: [{ owner: req.user!.id }, { project: { $in: projectIds } }] };
  const notifications = await Notification.find(scope).populate("project", "name repoFullName").sort({ createdAt: -1 }).limit(100).lean();
  const unread = await Notification.countDocuments({ ...scope, readAt: null });
  return res.json({ notifications, unread });
}
export async function markNotificationRead(req: Request, res: Response) {
  const projectIds = await accessibleProjectIds(req.user!.id);
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, $or: [{ owner: req.user!.id }, { project: { $in: projectIds } }] }, { $set: { readAt: new Date() } }, { new: true });
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  return res.json({ notification });
}
export async function markAllNotificationsRead(req: Request, res: Response) {
  const projectIds = await accessibleProjectIds(req.user!.id);
  await Notification.updateMany({ $or: [{ owner: req.user!.id }, { project: { $in: projectIds } }], readAt: null }, { $set: { readAt: new Date() } });
  return res.json({ message: "All notifications marked as read" });
}
export async function getPolicyTemplates(_req: Request, res: Response) {
  return res.json({ templates });
}
export async function applyPolicyTemplate(req: Request, res: Response) {
  const input = z.object({ projectId: z.string().min(1), template: z.enum(["startup", "enterprise", "security", "testing"]) }).parse(req.body);
  const project = await managedProject(input.projectId, req.user!.id);
  if (!project) return res.status(404).json({ message: "Project not found or insufficient permission" });
  const { label: _label, description: _description, ...policy } = templates[input.template];
  const rules = await QualityRule.findOneAndUpdate({ owner: project.owner, project: input.projectId }, { $set: policy, $setOnInsert: { owner: project.owner, project: input.projectId } }, { upsert: true, new: true, runValidators: true });
  await recordAudit({ owner: project.owner, project: input.projectId, actor: req.user!.id, actorLabel: req.user!.email, action: "quality.policy_template_applied", details: `${templates[input.template].label} policy applied` });
  return res.json({ rules, applied: input.template });
}


export async function getSlackSettings(req: Request, res: Response) {
  const user = await User.findById(req.user!.id).select("+slackWebhookEncrypted");
  return res.json({ configured: Boolean(user?.slackWebhookEncrypted) });
}
export async function saveSlackSettings(req: Request, res: Response) {
  const webhookUrl = z.string().url().refine(value => { try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "hooks.slack.com" && url.pathname.startsWith("/services/"); } catch { return false; } }, "Use a valid Slack Incoming Webhook URL").parse(req.body.webhookUrl);
  try {
    const response = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "GateGuard Slack notifications are connected successfully." }), signal: AbortSignal.timeout(5000) });
    if (!response.ok) return res.status(502).json({ message: "Slack rejected the test message. Check the webhook configuration." });
  } catch { return res.status(502).json({ message: "Could not reach Slack webhook. Check the URL and try again." }); }
  await User.findByIdAndUpdate(req.user!.id, { $set: { slackWebhookEncrypted: encrypt(webhookUrl) } });
  return res.json({ configured: true, message: "Slack webhook saved and test message delivered." });
}
export async function removeSlackSettings(req: Request, res: Response) {
  await User.findByIdAndUpdate(req.user!.id, { $unset: { slackWebhookEncrypted: 1 } });
  return res.json({ configured: false });
}


export async function listAuditLogs(req: Request, res: Response) {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  if (!projectId || !await canManageProject(projectId, req.user!.id)) return res.status(404).json({ message: "Project not found or insufficient permission" });
  const logs = await AuditLog.find({ project: projectId }).populate("actor", "name email").sort({ createdAt: -1 }).limit(100).lean();
  return res.json({ logs });
}
