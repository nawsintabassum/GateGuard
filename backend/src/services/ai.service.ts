import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
export async function explainFindings(findings: unknown[]) {
  if (!env.GEMINI_API_KEY || !findings.length) return "AI explanation is unavailable. Review the structured findings and recommendations below.";
  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Explain only these verified software analysis findings. Do not invent details. For each, state impact, likely cause, and a practical fix. Findings JSON: ${JSON.stringify(findings).slice(0, 12000)}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return "AI explanation service is temporarily unavailable. The analysis results remain available.";
  }
}
