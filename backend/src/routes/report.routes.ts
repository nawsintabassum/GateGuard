import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { exportReport } from "../controllers/report.controller";
const router = Router();
router.get("/:analysisId/pdf", asyncHandler(exportReport));
export default router;
