import { describe, expect, it } from "bun:test";
import { getJournalDir, resolvePath } from "../src/config";

describe("Configuration and Path Resolution", () => {
  it("resolves paths with tildes and relative paths", () => {
    expect(resolvePath("/absolute/path")).toBe("/absolute/path");
    expect(resolvePath("~/my-folder")).not.toContain("~");
  });

  it("returns customDir if passed directly", () => {
    expect(getJournalDir("/custom/path")).toBe("/custom/path");
  });

  it("returns JOURNAL_DIR from environment if set", () => {
    const orig = process.env.JOURNAL_DIR;
    process.env.JOURNAL_DIR = "/env/journal/path";
    try {
      expect(getJournalDir()).toBe("/env/journal/path");
    } finally {
      process.env.JOURNAL_DIR = orig;
    }
  });

  it("throws error when no directory argument or env variable is set", () => {
    const orig = process.env.JOURNAL_DIR;
    delete process.env.JOURNAL_DIR;
    try {
      expect(() => getJournalDir()).toThrow("Journal directory is required");
    } finally {
      process.env.JOURNAL_DIR = orig;
    }
  });
});
