import mongoose, { Schema } from "mongoose";
export interface IQualityRule {
  owner: mongoose.Types.ObjectId; project?: mongoose.Types.ObjectId;
  minCoverage: number; minTestPassRate: number; maxEslintErrors: number;
  maxCriticalVulnerabilities: number; maxHighVulnerabilities: number;
}
const RuleSchema = new Schema<IQualityRule>({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
  minCoverage: { type: Number, min: 0, max: 100, default: 80 },
  minTestPassRate: { type: Number, min: 0, max: 100, default: 95 },
  maxEslintErrors: { type: Number, min: 0, default: 0 },
  maxCriticalVulnerabilities: { type: Number, min: 0, default: 0 },
  maxHighVulnerabilities: { type: Number, min: 0, default: 0 }
}, { timestamps: true });
RuleSchema.index({ owner: 1, project: 1 }, { unique: true });
export const QualityRule = mongoose.model<IQualityRule>("QualityRule", RuleSchema);
