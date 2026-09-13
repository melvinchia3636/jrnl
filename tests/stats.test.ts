import { describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { calculateJournalStats, countWordsInText } from "../src/commands/stats";

describe("Word Count and Journal Statistics", () => {
  it("counts words correctly in various string formats", () => {
    expect(countWordsInText("")).toBe(0);
    expect(countWordsInText("   ")).toBe(0);
    expect(countWordsInText("Hello world")).toBe(2);
    expect(countWordsInText("Hello   \n\t world  foo   bar")).toBe(4);
  });

  it("calculates journal stats across multiple text files in directory", () => {
    const testDir = join(process.cwd(), `.test_stats_${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      writeFileSync(join(testDir, "JRNL-0001.txt"), "First page with five words.", "utf8");
      writeFileSync(join(testDir, "JRNL-0002.txt"), "Second page has some more words here.", "utf8");
      writeFileSync(join(testDir, "ignore.png"), "not a text file", "utf8");

      const stats = calculateJournalStats(testDir);
      expect(stats.pages.length).toBe(2);
      const page0 = stats.pages[0];
      const page1 = stats.pages[1];
      expect(page0).toBeDefined();
      expect(page1).toBeDefined();
      if (page0 && page1) {
        expect(page0.file).toBe("JRNL-0001.txt");
        expect(page0.words).toBe(5);
        expect(page1.file).toBe("JRNL-0002.txt");
        expect(page1.words).toBe(7);
      }
      expect(stats.totalWords).toBe(12);
      expect(stats.averageWordsPerPage).toBe(6);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("handles non-existent or empty directories gracefully", () => {
    const emptyDir = join(process.cwd(), `.test_empty_${Date.now()}`);
    const stats = calculateJournalStats(emptyDir);
    expect(stats.pages.length).toBe(0);
    expect(stats.totalWords).toBe(0);
    expect(stats.totalCharacters).toBe(0);
    expect(stats.averageWordsPerPage).toBe(0);
  });
});
