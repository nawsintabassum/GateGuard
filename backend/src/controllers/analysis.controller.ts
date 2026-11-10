import crypto from "crypto";
import { Request, Response } from "express";
import { z } from "zod";
import { Project } from "../models/Project";
import { QualityRule } from "../models/QualityRule";
import { Analysis } from "../models/Analysis";
import { evaluateQualityGate, Metrics } from "../services/qualityGate.service";
import { explainFindings } from "../services/ai.service";
import { sha256 } from "../utils/crypto";

const metricSchema = z.object({
  coverage: z.object({ statements: z.number().min(0).max(100), branches: z.number().min(0).max(100), functions: z.number().min(0).max(100), lines: z.number().min(0).max(100) }),
  tests: z.object({ total: z.number().int().min(0), passed: z.number().int().min(0), failed: z.number().int().min(0), skipped: z.number().int().min(0) }),
  eslint: z.object({ errors: z.number().int().min(0), warnings: z.number().int().min(0) }),
  security: z.object({ critical: z.number().int().min(0), high: z.number().int().min(0), moderate: z.number().int().min(0), low: z.number().int().min(0) }),
  pipeline: z.object({ typecheckPassed: z.boolean(), buildPassed: z.boolean(), lintExecuted: z.boolean(), auditCompleted: z.boolean() }).optional()
});
const findingSchema = z.array(z.object({
  severity: z.enum(["critical","high","medium","low","info"]).default("info"),
  title: z.string().min(1).max(300), message: z.string().optional(), file: z.string().optional(),
  line: z.number().int().optional(), package: z.string().optional(), recommendation: z.string().optional()
})).max(500);

async function storeResult(project: any, ownerId: string, body: any) {
  const parsed = metricSchema.parse(body.metrics);
  if (parsed.tests.passed + parsed.tests.failed + parsed.tests.skipped !== parsed.tests.total) {
    throw Object.assign(new Error("Test totals must equal passed + failed + skipped"), { statusCode: 400 });
  }
  const metrics: Metrics = { ...parsed, tests: { ...parsed.tests, passRate: parsed.tests.total ? Math.round(parsed.tests.passed / parsed.tests.total * 10000) / 100 : 0 } };
  const findings = findingSchema.parse(body.findings || []);
  if (body.branch !== undefined && (typeof body.branch !== "string" || body.branch.length > 120)) {
    throw Object.assign(new Error("branch must be a string no longer than 120 characters"), { statusCode: 400 });
  }
  if (body.source !== undefined && !["github-actions", "manual-import"].includes(body.source)) {
    throw Object.assign(new Error("source must be github-actions or manual-import"), { statusCode: 400 });
  }
  if (body.commitSha !== undefined && body.commitSha !== "" && !/^[a-f0-9]{7,40}$/i.test(body.commitSha)) {
    throw Object.assign(new Error("commitSha must be a valid Git commit SHA"), { statusCode: 400 });
  }
  if (body.durationMs !== undefined && (!Number.isInteger(body.durationMs) || body.durationMs < 0 || body.durationMs > 24 * 60 * 60 * 1000)) {
    throw Object.assign(new Error("durationMs must be a non-negative integer no greater than 24 hours"), { statusCode: 400 });
  }
  if (body.startedAt !== undefined && Number.isNaN(Date.parse(body.startedAt))) {
    throw Object.assign(new Error("startedAt must be a valid date"), { statusCode: 400 });
  }
  const rules = await QualityRule.findOne({ owner: ownerId, project: project._id }) ||
    await QualityRule.findOne({ owner: ownerId, project: null }) ||
    await QualityRule.create({ owner: ownerId, project: project._id });
  const gate = evaluateQualityGate(metrics, rules);
  const aiExplanation = await explainFindings(findings);
  const analysis = await Analysis.create({
    owner: ownerId, project: project._id, commitSha: body.commitSha, branch: body.branch || project.defaultBranch,
    source: body.source || "github-actions", status: gate.status, score: gate.score, metrics,
    findings, rules: gate.rules, aiExplanation, durationMs: body.durationMs, startedAt: body.startedAt ? new Date(body.startedAt) : undefined
  });
  project.lastAnalysisAt = new Date(); project.latestScore = gate.score; project.latestCoverage = metrics.coverage.lines; project.latestStatus = gate.status; await project.save();
  return analysis;
}
export async function ingestCiResult(req: Request, res: Response) {
  const project = await Project.findById(req.params.projectId).select("+ciTokenHash");
  if (!project) return res.status(404).json({ message: "Project not found" });
  const supplied = req.header("x-gateguard-token") || "";
  const suppliedHash = sha256(supplied);
  const expectedHash = project.ciTokenHash || "";
  const validToken = Boolean(supplied && expectedHash && Buffer.byteLength(suppliedHash) === Buffer.byteLength(expectedHash) && crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(expectedHash)));
  if (!validToken) return res.status(401).json({ message: "Invalid CI token" });
  const analysis = await storeResult(project, String(project.owner), req.body);
  res.status(201).json({ analysis, qualityGate: { status: analysis.status, score: analysis.score, rules: analysis.rules } });
}
export async function listAnalyses(req: Request, res: Response) {
  const filter: any = { owner: req.user!.id };
  if (typeof req.query.projectId === "string") {
    if (!await Project.exists({ _id: req.query.projectId, owner: req.user!.id })) return res.status(404).json({ message: "Project not found" });
    filter.project = req.query.projectId;
  }
  const analyses = await Analysis.find(filter).populate("project", "name repoFullName repoUrl").sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 50, 100));
  res.json({ analyses });
}
export async function getAnalysis(req: Request, res: Response) {
  const analysis = await Analysis.findOne({ _id: req.params.id, owner: req.user!.id }).populate("project", "name repoFullName repoUrl");
  if (!analysis) return res.status(404).json({ message: "Analysis not found" });
  res.json({ analysis });
}
export async function runAnalysis(req: Request, res: Response) {
  return res.status(501).json({ message: "Analysis is executed by the isolated GitHub Actions runner. Configure the workflow and CI token; the backend intentionally does not execute untrusted repository code." });
}
