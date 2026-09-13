import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { organizeJournalFiles } from "../src/commands/group";

describe("File Grouping Logic", () => {
  it("sorts images into images/ and texts into texts/ while preserving pdfs", () => {
    const testDir = join(process.cwd(), `.test_group_${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      writeFileSync(join(testDir, "page1.png"), "image-data");
      writeFileSync(join(testDir, "page2.jpg"), "image-data");
      writeFileSync(join(testDir, "page1.txt"), "text-data");
      writeFileSync(join(testDir, "journal.pdf"), "pdf-data");
      writeFileSync(join(testDir, "unknown.xyz"), "other-data");

      const result = organizeJournalFiles(testDir);

      expect(result.movedImages).toBe(2);
      expect(result.movedTexts).toBe(1);
      expect(result.pdfKept).toBe(1);
      expect(result.skipped).toEqual(["unknown.xyz"]);

      expect(existsSync(join(testDir, "images", "page1.png"))).toBe(true);
      expect(existsSync(join(testDir, "images", "page2.jpg"))).toBe(true);
      expect(existsSync(join(testDir, "texts", "page1.txt"))).toBe(true);
      expect(existsSync(join(testDir, "journal.pdf"))).toBe(true);
      expect(existsSync(join(testDir, "unknown.xyz"))).toBe(true);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
