import mongoose, { Schema } from "mongoose";
export interface IProject {
  owner: mongoose.Types.ObjectId; name: string; repoFullName: string; repoUrl: string;
  defaultBranch: string; language?: string; description?: string; ciTokenHash: string;
  lastAnalysisAt?: Date; latestScore?: number; latestCoverage?: number; latestStatus?: "PASS"|"FAIL"|"WARNING";
}
const ProjectSchema = new Schema<IProject>({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true },
  repoFullName: { type: String, required: true, trim: true },
  repoUrl: { type: String, required: true },
  defaultBranch: { type: String, default: "main" },
  language: String, description: String, ciTokenHash: { type: String, required: true, select: false },
  lastAnalysisAt: Date, latestScore: { type: Number, default: 0 }, latestCoverage: { type: Number, min: 0, max: 100, default: 0 },
  latestStatus: { type: String, enum: ["PASS","FAIL","WARNING"], default: "WARNING" }
}, { timestamps: true });
ProjectSchema.index({ owner: 1, repoFullName: 1 }, { unique: true });
export const Project = mongoose.model<IProject>("Project", ProjectSchema);
