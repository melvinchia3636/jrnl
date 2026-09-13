import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export const JRNL_MAGIC = Buffer.from("JRNL\x00\x01\x00\x01", "latin1");

export type SpineMetadata = {
  volume: number;
  startDate: string;
  endDate: string;
  key: string;
};

export function parseIsoDate(dateStr: string): dayjs.Dayjs {
  return dayjs(dateStr, "YYYY-MM-DD", true);
}

export function parseSpineData(raw: string): SpineMetadata {
  const parts = raw.trim().split(",").map((s) => s.trim());
  if (parts.length < 4) {
    throw new Error(
      `Invalid spine Data Matrix format. Expected: "<volume>,<startDate>,<endDate>,<key>", got: "${raw}"`,
    );
  }

  const part0 = parts[0];
  const part1 = parts[1];
  const part2 = parts[2];
  const part3 = parts[3];

  if (part0 === undefined || part1 === undefined || part2 === undefined || part3 === undefined) {
    throw new Error(
      `Invalid spine Data Matrix format. Expected: "<volume>,<startDate>,<endDate>,<key>", got: "${raw}"`,
    );
  }

  const volume = parseInt(part0, 10);
  if (isNaN(volume) || volume <= 0) {
    throw new Error(`Invalid volume number in spine Data Matrix: "${part0}"`);
  }

  const start = parseIsoDate(part1);
  if (!start.isValid()) {
    throw new Error(
      `Invalid start date: "${part1}". Expected strict YYYY-MM-DD format (e.g. 2026-06-01).`,
    );
  }

  const end = parseIsoDate(part2);
  if (!end.isValid()) {
    throw new Error(
      `Invalid end date: "${part2}". Expected strict YYYY-MM-DD format (e.g. 2026-06-14).`,
    );
  }

  const key = part3;
  if (!key) {
    throw new Error("Missing encryption key in spine Data Matrix.");
  }

  return {
    volume,
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
    key,
  };
}

export function sha256(buf: Buffer): Buffer {
  return createHash("sha256").update(buf).digest();
}

export function deriveAesKey(passphrase: string): Buffer {
  return createHash("sha256").update(passphrase, "utf8").digest();
}

export function encryptAesGcm(plainBuffer: Buffer, keyString: string): Buffer {
  const key = deriveAesKey(keyString);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptAesGcm(encryptedBuffer: Buffer, keyString: string): Buffer {
  if (encryptedBuffer.length < 28) {
    throw new Error("Invalid encrypted payload: buffer is too short");
  }

  const key = deriveAesKey(keyString);
  const iv = encryptedBuffer.subarray(0, 12);
  const authTag = encryptedBuffer.subarray(12, 28);
  const ciphertext = encryptedBuffer.subarray(28);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function createJrnlPackage(
  manifestBuffer: Buffer,
  encryptedBodyBuffer: Buffer,
): Buffer {
  const manifestHash = sha256(manifestBuffer);
  const manifestB64 = manifestBuffer.toString("base64");
  const tarHash = sha256(encryptedBodyBuffer);

  const b64lenBuffer = Buffer.alloc(4);
  b64lenBuffer.writeUInt32BE(Buffer.byteLength(manifestB64), 0);

  const bodylenBuffer = Buffer.alloc(8);
  bodylenBuffer.writeBigUInt64BE(BigInt(encryptedBodyBuffer.length), 0);

  const header = Buffer.concat([
    JRNL_MAGIC,
    manifestHash,
    b64lenBuffer,
    Buffer.from(manifestB64, "latin1"),
    tarHash,
    bodylenBuffer,
  ]);

  return Buffer.concat([header, encryptedBodyBuffer]);
}

export type ParsedJrnl = {
  manifest: Buffer;
  manifestHash: Buffer;
  manifestValid: boolean;
  body: Buffer;
  tarHash: Buffer;
  bodyValid: boolean;
};

export function parseJrnlPackage(data: Buffer): ParsedJrnl {
  if (data.length < 8) {
    throw new Error("Invalid .jrnl file: file is too small");
  }

  const magic = data.subarray(0, 8);
  if (!magic.equals(JRNL_MAGIC)) {
    throw new Error("Invalid .jrnl file: bad magic header");
  }

  const manifestHash = data.subarray(8, 40);
  const b64len = data.readUInt32BE(40);
  const manifestB64 = data.subarray(44, 44 + b64len).toString("latin1");
  const manifest = Buffer.from(manifestB64, "base64");

  let off = 44 + b64len;
  const tarHash = data.subarray(off, off + 32);
  off += 32;
  const bodyLen = Number(data.readBigUInt64BE(off));
  off += 8;
  const body = data.subarray(off, off + bodyLen);

  const actualManifestHash = sha256(manifest);
  const actualTarHash = sha256(body);

  return {
    manifest,
    manifestHash,
    manifestValid: actualManifestHash.equals(manifestHash),
    body,
    tarHash,
    bodyValid: actualTarHash.equals(tarHash),
  };
}
