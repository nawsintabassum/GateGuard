import mongoose, { Schema } from "mongoose";
const FindingSchema = new Schema({
  severity: { type: String, enum: ["critical","high","medium","low","info"], default: "info" },
  title: { type: String, required: true }, message: String, file: String, line: Number,
  package: String, recommendation: String
}, { _id: false });
const RuleResultSchema = new Schema({
  key: String, label: String, passed: Boolean, actual: Schema.Types.Mixed, expected: Schema.Types.Mixed, reason: String
}, { _id: false });
const AnalysisSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  commitSha: String, branch: String, source: { type: String, enum: ["github-actions","manual-import"], default: "github-actions" },
  status: { type: String, enum: ["PASS","FAIL","WARNING"], required: true },
  score: { type: Number, min: 0, max: 100, required: true },
  metrics: {
    coverage: { statements: Number, branches: Number, functions: Number, lines: Number },
    tests: { total: Number, passed: Number, failed: Number, skipped: Number, passRate: Number },
    eslint: { errors: Number, warnings: Number },
    security: { critical: Number, high: Number, moderate: Number, low: Number },
    pipeline: { typecheckPassed: Boolean, buildPassed: Boolean, lintExecuted: Boolean, auditCompleted: Boolean }
  },
  findings: [FindingSchema], rules: [RuleResultSchema], aiExplanation: String,
  durationMs: Number, startedAt: Date
}, { timestamps: true });
AnalysisSchema.index({ owner: 1, project: 1, createdAt: -1 });
export const Analysis = mongoose.model("Analysis", AnalysisSchema);
