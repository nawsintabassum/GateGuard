import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getRules, updateRules } from "../controllers/rules.controller";
const router = Router();
router.get("/", asyncHandler(getRules));
router.put("/", asyncHandler(updateRules));
export default router;
