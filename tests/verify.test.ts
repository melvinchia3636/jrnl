import { describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createJrnlPackage, encryptAesGcm, parseJrnlPackage } from "../src/utils/crypto";

describe("Integrity Verification Functionality", () => {
  it("validates integrity and metadata for valid encrypted .jrnl file", () => {
    const testDir = join(process.cwd(), `.test_verify_${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const manifest = {
        volume: 3,
        startDate: "2026-06-01",
        endDate: "2026-06-14",
      };
      const manifestBuf = Buffer.from(JSON.stringify(manifest), "utf8");
      const plainBody = Buffer.from("mock tar content", "utf8");
      const encryptedBody = encryptAesGcm(plainBody, "XSLCGOMI041IQNUY");

      const packageBuf = createJrnlPackage(manifestBuf, encryptedBody);
      const jrnlPath = join(testDir, "test.jrnl");
      writeFileSync(jrnlPath, packageBuf);

      const parsed = parseJrnlPackage(packageBuf);
      expect(parsed.manifestValid).toBe(true);
      expect(parsed.bodyValid).toBe(true);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("detects corrupted package payload during integrity check", () => {
    const manifestBuf = Buffer.from(JSON.stringify({ title: "Test" }), "utf8");
    const bodyBuf = Buffer.from("mock body", "utf8");
    const packageBuf = createJrnlPackage(manifestBuf, bodyBuf);

    // Corrupt the body
    const lastByte = packageBuf[packageBuf.length - 1];
    if (lastByte !== undefined) {
      packageBuf[packageBuf.length - 1] = lastByte ^ 0xff;
    }

    const parsed = parseJrnlPackage(packageBuf);
    expect(parsed.manifestValid).toBe(true);
    expect(parsed.bodyValid).toBe(false);
  });
});
