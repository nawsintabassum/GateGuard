import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ingestCiResult } from "../controllers/analysis.controller";
const router = Router();
router.post("/:projectId/results", asyncHandler(ingestCiResult));
export default router;
