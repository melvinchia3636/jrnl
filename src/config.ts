import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const DEFAULT_HOST = process.env.SSH_HOST || "raspi@raspi.local";

export function resolvePath(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  if (p.startsWith("~")) return p.replace(/^~/, homedir());
  return resolve(p);
}

export function getJournalDir(customDir?: string): string {
  if (customDir) {
    return resolvePath(customDir);
  }
  if (process.env.JOURNAL_DIR) {
    return resolvePath(process.env.JOURNAL_DIR);
  }
  throw new Error(
    "Journal directory is required. Specify via --dir / -d flag or set JOURNAL_DIR in environment/.env.",
  );
}

export function getSshHost(customHost?: string): string {
  return customHost || process.env.SSH_HOST || DEFAULT_HOST;
}

export function getSshPassword(customPass?: string): string {
  const pass = customPass || process.env.SSH_PASS;
  if (!pass) {
    throw new Error(
      "SSH password required. Set SSH_PASS in environment/.env or pass --pass / -p flag.",
    );
  }
  return pass;
}

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set.",
    );
  }
  return key;
}
