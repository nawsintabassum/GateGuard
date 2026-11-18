import { Project } from "../models/Project";
import { ProjectMember } from "../models/ProjectMember";
export async function accessibleProjectIds(userId: string) {
  const [owned, memberships] = await Promise.all([
    Project.find({ owner: userId }).select("_id").lean(),
    ProjectMember.find({ user: userId, status: "active" }).select("project").lean()
  ]);
  return [...new Set([...owned.map(p => String(p._id)), ...memberships.map(m => String(m.project))])];
}
export async function canAccessProject(projectId: string, userId: string) {
  const memberProjectIds = await ProjectMember.find({ user: userId, status: "active" }).distinct("project");
  const project = await Project.findOne({ _id: projectId, $or: [{ owner: userId }, { _id: { $in: memberProjectIds } }] }).select("_id owner");
  return project;
}
export async function canManageProject(projectId: string, userId: string) {
  const project = await Project.findOne({ _id: projectId, owner: userId }).select("_id");
  if (project) return true;
  return Boolean(await ProjectMember.exists({ project: projectId, user: userId, status: "active", role: { $in: ["admin", "manager"] } }));
}

export async function canAdminProject(projectId: string, userId: string) {
  if (await Project.exists({ _id: projectId, owner: userId })) return true;
  return Boolean(await ProjectMember.exists({ project: projectId, user: userId, status: "active", role: "admin" }));
}
