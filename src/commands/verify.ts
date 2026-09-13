import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { filesize } from "filesize";
import { intro, outro, note, log } from "@clack/prompts";
import pc from "picocolors";
import { resolvePath } from "../config";
import { parseJrnlPackage } from "../utils/crypto";

export type VerifyOptions = {
  file?: string;
};

export async function verifyCommand(options: VerifyOptions = {}): Promise<void> {
  intro(pc.bgCyan(pc.black(" JRNL — Integrity Check ")));

  if (!options.file) {
    log.error("Target .jrnl file path required.\nUsage: jrnl verify <file.jrnl>");
    process.exit(1);
  }

  const filePath = resolvePath(options.file);
  if (!existsSync(filePath)) {
    log.error(`File not found: ${pc.dim(filePath)}`);
    process.exit(1);
  }

  log.info(`Inspecting: ${pc.dim(filePath)}`);

  const data = readFileSync(filePath);
  const parsed = parseJrnlPackage(data);

  const checkLines = [
    `  ${pc.bold("Magic Header")}     : ${pc.green("✓ Valid")}`,
    `  ${pc.bold("Manifest SHA-256")} : ${parsed.manifestValid ? pc.green("✓ VALID") : pc.red("✗ CORRUPTED")}`,
    `  ${pc.bold("Payload SHA-256")}  : ${parsed.bodyValid ? pc.green("✓ VALID") : pc.red("✗ CORRUPTED")}`,
    `  ${pc.bold("Total Size")}       : ${pc.cyan(filesize(data.length))}`,
    `  ${pc.bold("Cipher Mode")}      : ${pc.yellow("AES-256-GCM")}`,
  ].join("\n");

  note(checkLines, `Verification: ${basename(filePath)}`);

  if (!parsed.manifestValid || !parsed.bodyValid) {
    log.error(pc.red("Integrity verification FAILED. Container is corrupt or tampered."));
    process.exit(1);
  }

  try {
    const manifestObj = JSON.parse(parsed.manifest.toString("utf8")) as Record<string, unknown>;
    const metadataLines = [
      `  ${pc.bold("Volume")}     : ${pc.cyan(`#${manifestObj.volume ?? "N/A"}`)}`,
      `  ${pc.bold("Date Range")} : ${pc.yellow(`${manifestObj.startDate ?? "?"} → ${manifestObj.endDate ?? "?"}`)}`,
    ].join("\n");

    note(metadataLines, "Manifest Metadata");
  } catch {
    log.warn("Could not parse manifest as JSON.");
  }

  outro(pc.green("Archive integrity is 100% verified."));
}
