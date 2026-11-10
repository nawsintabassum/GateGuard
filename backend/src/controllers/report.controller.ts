
import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { Analysis } from "../models/Analysis";

export async function exportReport(req: Request, res: Response) {
  const analysis = await Analysis.findOne({
    _id: req.params.analysisId,
    owner: req.user!.id,
  }).populate("project", "name repoFullName");

  if (!analysis) {
    return res.status(404).json({ message: "Analysis not found" });
  }

  const project: any = analysis.project;

  // Safely handle missing metrics
  const metrics = analysis.metrics;

  const coverage = metrics?.coverage;
  const tests = metrics?.tests;
  const eslint = metrics?.eslint;
  const security = metrics?.security;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="gateguard-${analysis.id}.pdf"`
  );

  const doc = new PDFDocument({
    margin: 52,
    size: "A4",
  });

  doc.pipe(res);

  // Header
  doc.fontSize(22).text("GateGuard Quality Report");

  doc
    .moveDown()
    .fontSize(13)
    .text(project?.name || "Project");

  doc
    .fontSize(10)
    .fillColor("#555")
    .text(project?.repoFullName || "");

  // Quality score
  doc
    .moveDown()
    .fillColor("#111")
    .fontSize(14)
    .text(
      `Quality Gate: ${analysis.status} | Score: ${analysis.score}/100`
    );

  // Metrics
  doc.moveDown().fontSize(12).text("Metrics");

  doc
    .fontSize(10)
    .text(`Line coverage: ${coverage?.lines ?? 0}%`);

  doc.text(
    `Test pass rate: ${tests?.passRate ?? 0}% (${tests?.passed ?? 0}/${tests?.total ?? 0})`
  );

  doc.text(`ESLint errors: ${eslint?.errors ?? 0}`);

  doc.text(
    `Security vulnerabilities — critical: ${security?.critical ?? 0}, high: ${security?.high ?? 0}, moderate: ${security?.moderate ?? 0}`
  );

  // Quality rules
  doc.moveDown().fontSize(12).text("Quality rules");

  for (const rule of analysis.rules ?? []) {
    doc
      .fontSize(9)
      .text(
        `${rule.passed ? "PASS" : "FAIL"} — ${rule.label}: ${rule.reason}`
      );
  }

  // Findings
  doc.moveDown().fontSize(12).text("Findings");

  for (const finding of analysis.findings ?? []) {
    doc
      .fontSize(9)
      .text(
        `[${finding.severity.toUpperCase()}] ${finding.title}${
          finding.file
            ? ` — ${finding.file}${finding.line ? `:${finding.line}` : ""}`
            : ""
        }\n${finding.message || ""}\nRecommendation: ${
          finding.recommendation || "Review finding details."
        }`,
        { paragraphGap: 5 }
      );
  }

  // AI explanation
  doc.moveDown().fontSize(12).text("AI explanation");

  doc
    .fontSize(9)
    .text(analysis.aiExplanation || "Not available");

  doc.end();
}
