import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export type MLFeatures = Record<string, number>;
export type MLPrediction = { model_version: string; risk_probability: number; threshold: number; risk_prediction: number };

export async function predictRisk(features: MLFeatures): Promise<MLPrediction | null> {
  const json = JSON.stringify(features);
  // On Windows, 'python' is standard while 'python3' often points to Windows Store stub
  const candidates = process.platform === "win32" ? ["python", "python3"] : ["python3", "python"];
  for (const cmd of candidates) {
    try {
      const { stdout } = await run(cmd, ["ml/src/predict.py", json], { cwd: process.cwd(), timeout: 2500 });
      if (stdout && stdout.trim()) {
        return JSON.parse(stdout.trim()) as MLPrediction;
      }
    } catch {
      // Try next candidate or gracefully return null
    }
  }
  return null;
}