import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

/** Uses only evidence supplied by the CI runner. AI output is advisory, never a gate decision. */
export async function explainFindings(findings: unknown[], context: Record<string, unknown> = {}) {
  if (!findings.length) return "No verified findings were submitted by CI. AI cannot infer failures without test output, logs, or scanner findings.";
  if (!env.GEMINI_API_KEY) return "Gemini is not configured. Add GEMINI_API_KEY to the backend environment to enable AI explanations. Structured findings and quality-gate results are still available.";
  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are GateGuard's senior software quality and security reviewer. Analyze ONLY the evidence below. Never invent a file, function, line, test output, CVE, package version, or root cause. Clearly label hypotheses as likely causes, and say when evidence is insufficient. For each failed test or finding provide: (1) what failed, (2) impact/severity, (3) likely root cause with confidence, (4) affected file/function only if supplied, (5) concrete fix steps, (6) a suggested regression test. End with a prioritized action list. Keep the response concise and developer-actionable.
CONTEXT: ${JSON.stringify(context).slice(0, 4000)}
VERIFIED FINDINGS: ${JSON.stringify(findings).slice(0, 16000)}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini explanation failed:", error instanceof Error ? error.message : "unknown error");
    return "Gemini explanation is temporarily unavailable. The verified findings and quality-gate result remain available.";
  }
}
