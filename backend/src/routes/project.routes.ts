
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  listProjects,
  createProject,
  getProject,
  deleteProject,
  regenerateCiToken,
} from "../controllers/project.controller";

const router = Router();

router.get("/", asyncHandler(listProjects));
router.post("/", asyncHandler(createProject));
router.post("/:id/ci-token/regenerate", asyncHandler(regenerateCiToken));
router.get("/:id", asyncHandler(getProject));
router.delete("/:id", asyncHandler(deleteProject));

export default router;
