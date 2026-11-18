
import { Request, Response } from "express";
import { z } from "zod";
import { Project } from "../models/Project";
import { Analysis } from "../models/Analysis";
import { QualityRule } from "../models/QualityRule";
import { randomToken, sha256 } from "../utils/crypto";
import { accessibleProjectIds, canAccessProject } from "../utils/projectAccess";
import { ProjectMember } from "../models/ProjectMember";
import { AuditLog } from "../models/AuditLog";
import { Notification } from "../models/Notification";

const projectInput = z.object({
  name: z.string().trim().min(1).max(100).optional(),

  repoUrl: z
    .string()
    .trim()
    .url()
    .refine(
      (value) =>
        /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(value),
      "Only GitHub repository URLs are supported"
    ),

  branch: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(
      /^[^\s~^:?\x5B\x5C]+$/,
      "Branch name contains invalid characters"
    )
    .optional(),
});

export async function listProjects(req: Request, res: Response) {
  const ids = await accessibleProjectIds(req.user!.id);
  const projects = await Project.find({
    _id: { $in: ids },
  })
    .sort({ updatedAt: -1 })
    .select("-ciTokenHash");

  res.json({ projects });
}

export async function createProject(req: Request, res: Response) {
  const input = projectInput.parse(req.body);

  const cleanUrl = input.repoUrl.replace(/\/$/, "");
  const parts = new URL(cleanUrl).pathname.split("/").filter(Boolean);

  if (parts.length !== 2) {
    return res.status(400).json({
      message: "Invalid GitHub repository URL",
    });
  }

  const [owner, repo] = parts;

  const ciToken = randomToken();

  const project = await Project.create({
    owner: req.user!.id,
    name: input.name || repo,
    repoFullName: `${owner}/${repo}`,
    repoUrl: cleanUrl,
    defaultBranch: input.branch || "main",
    ciTokenHash: sha256(ciToken),
  });

  await QualityRule.create({
    owner: req.user!.id,
    project: project._id,
  });

  const { ciTokenHash: _ciTokenHash, ...safeProject } =
    project.toObject();

  res.status(201).json({
    project: safeProject,
    ciToken,
  });
}

export async function getProject(req: Request, res: Response) {
  const project = await canAccessProject(req.params.id, req.user!.id);
  const safeProject = project ? await Project.findById(project._id).select("-ciTokenHash") : null;

  if (!safeProject) {
    return res.status(404).json({
      message: "Project not found",
    });
  }

  res.json({ project: safeProject });
}

export async function deleteProject(req: Request, res: Response) {
  const project = await Project.findOneAndDelete({
    _id: req.params.id,
    owner: req.user!.id,
  });

  if (!project) {
    return res.status(404).json({
      message: "Project not found",
    });
  }

  await Promise.all([
    QualityRule.deleteMany({
      owner: req.user!.id,
      project: project._id,
    }),

    Analysis.deleteMany({
      owner: req.user!.id,
      project: project._id,
    }),
    ProjectMember.deleteMany({ project: project._id }),
    AuditLog.deleteMany({ project: project._id }),
    Notification.deleteMany({ project: project._id }),
  ]);

  res.json({
    message: "Project deleted",
  });
}

// Regenerate CI token for a project
export async function regenerateCiToken(req: Request, res: Response) {
  const project = await Project.findOne({
    _id: req.params.id,
    owner: req.user!.id,
  }).select("+ciTokenHash");

  if (!project) {
    return res.status(404).json({
      message: "Project not found",
    });
  }

  const ciToken = randomToken();

  project.ciTokenHash = sha256(ciToken);
  await project.save();

  return res.json({
    message: "CI token regenerated successfully",
    ciToken,
  });
}
