import { Request, Response } from "express";
import { z } from "zod";
import { QualityRule } from "../models/QualityRule";
import { Project } from "../models/Project";
const schema = z.object({
  minCoverage: z.number().min(0).max(100), minTestPassRate: z.number().min(0).max(100),
  maxEslintErrors: z.number().int().min(0), maxCriticalVulnerabilities: z.number().int().min(0),
  maxHighVulnerabilities: z.number().int().min(0)
});
export async function getRules(req: Request, res: Response) {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  if (projectId && !await Project.exists({ _id: projectId, owner: req.user!.id })) return res.status(404).json({ message: "Project not found" });
  let rule = await QualityRule.findOne({ owner: req.user!.id, project: projectId || null });
  if (!rule) rule = await QualityRule.create({ owner: req.user!.id, project: projectId || null });
  res.json({ rules: rule });
}
export async function updateRules(req: Request, res: Response) {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  if (projectId && !await Project.exists({ _id: projectId, owner: req.user!.id })) return res.status(404).json({ message: "Project not found" });
  const data = schema.parse(req.body);
  const rules = await QualityRule.findOneAndUpdate(
    { owner: req.user!.id, project: projectId || null },
    { $set: data, $setOnInsert: { owner: req.user!.id, project: projectId || null } },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ rules });
}
