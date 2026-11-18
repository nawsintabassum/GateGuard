import { Request, Response } from "express";
import { z } from "zod";
import { QualityRule } from "../models/QualityRule";
import { Project } from "../models/Project";
import { canAccessProject, canManageProject } from "../utils/projectAccess";
import { recordAudit } from "../utils/audit";
const schema = z.object({
  minCoverage: z.number().min(0).max(100), minTestPassRate: z.number().min(0).max(100),
  maxEslintErrors: z.number().int().min(0), maxCriticalVulnerabilities: z.number().int().min(0),
  maxHighVulnerabilities: z.number().int().min(0)
});
export async function getRules(req: Request, res: Response) {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  if (projectId && !await canAccessProject(projectId, req.user!.id)) return res.status(404).json({ message: "Project not found" });
  const project = projectId ? await Project.findById(projectId).select("owner") : null;
  let rule = await QualityRule.findOne({ owner: project?.owner || req.user!.id, project: projectId || null });
  if (!rule) rule = await QualityRule.create({ owner: project?.owner || req.user!.id, project: projectId || null });
  res.json({ rules: rule });
}
export async function updateRules(req: Request, res: Response) {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  if (projectId && !await canManageProject(projectId, req.user!.id)) return res.status(404).json({ message: "Project not found" });
  const data = schema.parse(req.body);
  const project = projectId ? await Project.findById(projectId).select("owner") : null;
  const rules = await QualityRule.findOneAndUpdate(
    { owner: project?.owner || req.user!.id, project: projectId || null },
    { $set: data, $setOnInsert: { owner: project?.owner || req.user!.id, project: projectId || null } },
    { upsert: true, new: true, runValidators: true }
  );
  if (projectId) {
    const project = await Project.findById(projectId).select("owner");
    await recordAudit({ owner: project?.owner, project: projectId, actor: req.user!.id, actorLabel: req.user!.email, action: "quality.rules_updated", details: "Project quality thresholds updated" });
  }
  res.json({ rules });
}
