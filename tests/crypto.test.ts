import { describe, expect, it } from "bun:test";
import {
  createJrnlPackage,
  decryptAesGcm,
  encryptAesGcm,
  parseJrnlPackage,
  parseSpineData,
  sha256,
} from "../src/utils/crypto";

describe("Crypto and .jrnl Package Utilities", () => {
  it("computes accurate sha256 hash", () => {
    const input = Buffer.from("test content", "utf8");
    const hash = sha256(input);
    expect(hash.length).toBe(32);
    expect(hash.toString("hex")).toBe(
      "6ae8a75555209fd6c44157c0aed8016e763ff435a19cf186f76863140143ff72",
    );
  });

  it("parses spine Data Matrix format correctly with strict YYYY-MM-DD dates", () => {
    const raw = "3,2026-06-01,2026-06-14,XSLCGOMI041IQNUY";
    const spine = parseSpineData(raw);
    expect(spine.volume).toBe(3);
    expect(spine.startDate).toBe("2026-06-01");
    expect(spine.endDate).toBe("2026-06-14");
    expect(spine.key).toBe("XSLCGOMI041IQNUY");
  });

  it("rejects non-YYYY-MM-DD date formats and invalid strings", () => {
    expect(() => parseSpineData("invalid")).toThrow("Expected: \"<volume>,<startDate>,<endDate>,<key>\"");
    expect(() => parseSpineData("abc,2026-06-01,2026-06-14,KEY")).toThrow("Invalid volume number");
    expect(() => parseSpineData("3,14/06/2026,2026-06-14,KEY")).toThrow("Expected strict YYYY-MM-DD format");
    expect(() => parseSpineData("3,2026-06-01,14/06/2026,KEY")).toThrow("Expected strict YYYY-MM-DD format");
    expect(() => parseSpineData("1,invalid-date,2026-06-14,KEY")).toThrow("Expected strict YYYY-MM-DD format");
    expect(() => parseSpineData("1,2026-06-01,2026-06-14,")).toThrow("Missing encryption key");
  });

  it("encrypts and decrypts payload with AES-256-GCM", () => {
    const plain = Buffer.from("Sensitive Journal Secrets & Transcripts", "utf8");
    const key = "XSLCGOMI041IQNUY";

    const encrypted = encryptAesGcm(plain, key);
    expect(encrypted.length).toBeGreaterThan(plain.length);

    const decrypted = decryptAesGcm(encrypted, key);
    expect(decrypted.toString("utf8")).toBe(plain.toString("utf8"));
  });

  it("fails decryption if AES-256-GCM auth tag or key is wrong", () => {
    const plain = Buffer.from("Secret Data", "utf8");
    const key = "XSLCGOMI041IQNUY";
    const encrypted = encryptAesGcm(plain, key);

    expect(() => decryptAesGcm(encrypted, "WRONG_KEY_HERE")).toThrow();

    const tampered = Buffer.from(encrypted);
    const lastByte = tampered[tampered.length - 1];
    if (lastByte !== undefined) {
      tampered[tampered.length - 1] = lastByte ^ 0xff;
    }
    expect(() => decryptAesGcm(tampered, key)).toThrow();
  });

  it("packages and parses valid .jrnl container with magic header", () => {
    const manifest = Buffer.from(
      JSON.stringify({ volume: 3, startDate: "2026-06-01", endDate: "2026-06-14" }),
      "utf8",
    );
    const rawBody = Buffer.from("secret tar content", "utf8");
    const encryptedBody = encryptAesGcm(rawBody, "XSLCGOMI041IQNUY");

    const packageBuffer = createJrnlPackage(manifest, encryptedBody);
    const parsed = parseJrnlPackage(packageBuffer);

    expect(parsed.manifestValid).toBe(true);
    expect(parsed.bodyValid).toBe(true);

    const decrypted = decryptAesGcm(parsed.body, "XSLCGOMI041IQNUY");
    expect(decrypted.toString("utf8")).toBe(rawBody.toString("utf8"));
  });

  it("detects corrupted manifest payload", () => {
    const manifest = Buffer.from(JSON.stringify({ title: "Test" }), "utf8");
    const bodyTar = Buffer.from("mock body", "utf8");

    const packageBuffer = createJrnlPackage(manifest, bodyTar);
    const targetByte = packageBuffer[45];
    if (targetByte !== undefined) {
      packageBuffer[45] = targetByte ^ 0xff;
    }

    const parsed = parseJrnlPackage(packageBuffer);
    expect(parsed.manifestValid).toBe(false);
  });

  it("detects corrupted body payload", () => {
    const manifest = Buffer.from(JSON.stringify({ title: "Test" }), "utf8");
    const bodyTar = Buffer.from("mock body payload", "utf8");

    const packageBuffer = createJrnlPackage(manifest, bodyTar);
    const lastByte = packageBuffer[packageBuffer.length - 1];
    if (lastByte !== undefined) {
      packageBuffer[packageBuffer.length - 1] = lastByte ^ 0xff;
    }

    const parsed = parseJrnlPackage(packageBuffer);
    expect(parsed.bodyValid).toBe(false);
  });

  it("throws on invalid magic header or too small buffer", () => {
    expect(() => parseJrnlPackage(Buffer.from("short"))).toThrow(
      "file is too small",
    );

    const badMagicBuffer = Buffer.alloc(100);
    expect(() => parseJrnlPackage(badMagicBuffer)).toThrow("bad magic header");
  });
});
