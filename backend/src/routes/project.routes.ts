import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { listProjects, createProject, getProject, deleteProject } from "../controllers/project.controller";
const router = Router();
router.get("/", asyncHandler(listProjects));
router.post("/", asyncHandler(createProject));
router.get("/:id", asyncHandler(getProject));
router.delete("/:id", asyncHandler(deleteProject));
export default router;
