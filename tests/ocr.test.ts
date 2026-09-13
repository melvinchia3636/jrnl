import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

describe("OCR Skip Detection Logic", () => {
  it("detects existing transcription files across root and texts directories", () => {
    const testDir = join(process.cwd(), `.test_ocr_skip_${Date.now()}`);
    mkdirSync(join(testDir, "texts"), { recursive: true });

    try {
      const stem = "JRNL-0001";
      writeFileSync(join(testDir, "texts", `${stem}.txt`), "Existing transcribed prose", "utf8");

      const possibleTxtPaths = [
        join(testDir, "texts", `${stem}.txt`),
        join(testDir, `${stem}.txt`),
      ];
      const existingTxtPath = possibleTxtPaths.find((p) => existsSync(p));

      expect(existingTxtPath).toBe(join(testDir, "texts", "JRNL-0001.txt"));
      expect(existsSync(existingTxtPath!)).toBe(true);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
