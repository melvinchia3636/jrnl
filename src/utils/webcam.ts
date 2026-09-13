import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseSpineData, type SpineMetadata } from "./crypto";

export async function scanSpineWithWebcam(): Promise<SpineMetadata> {
  const binPath = join(process.cwd(), "bin", "scanner");
  const swiftPath = join(process.cwd(), "src", "utils", "scanner.swift");

  const [cmd, args] = existsSync(binPath)
    ? [binPath, []]
    : ["swift", [swiftPath]];

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdoutData = "";
    let stderrData = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdoutData += chunk.toString("utf8");
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderrData += chunk.toString("utf8");
    });

    proc.on("close", (code: number) => {
      if (code !== 0) {
        const errorMsg = stderrData.trim() || "Webcam scan cancelled or timed out.";
        return reject(new Error(errorMsg));
      }

      const raw = stdoutData.trim();
      if (!raw) {
        return reject(new Error("No Data Matrix payload received from scanner."));
      }

      try {
        const metadata = parseSpineData(raw);
        resolve(metadata);
      } catch (err) {
        reject(err);
      }
    });

    proc.on("error", (err: Error) => {
      reject(new Error(`Failed to launch webcam scanner: ${err.message}`));
    });
  });
}
