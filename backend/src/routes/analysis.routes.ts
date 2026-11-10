import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { listAnalyses, getAnalysis, runAnalysis } from "../controllers/analysis.controller";
const router = Router();
router.get("/", asyncHandler(listAnalyses));
router.post("/projects/:projectId/run", asyncHandler(runAnalysis));
router.get("/:id", asyncHandler(getAnalysis));
export default router;
