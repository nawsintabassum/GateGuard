import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { listAnalyses, getAnalysis, runAnalysis, projectAnalytics } from "../controllers/analysis.controller";
const router = Router();
router.get("/", asyncHandler(listAnalyses));
router.get("/analytics/:projectId", asyncHandler(projectAnalytics));
router.post("/projects/:projectId/run", asyncHandler(runAnalysis));
router.get("/:id", asyncHandler(getAnalysis));
export default router;
