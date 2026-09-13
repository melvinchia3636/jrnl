import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawn } from "node:child_process";
import { basename, join } from "node:path";
import { filesize } from "filesize";
import { intro, outro, spinner, note, log } from "@clack/prompts";
import pc from "picocolors";
import { resolvePath } from "../config";
import { decryptAesGcm, parseJrnlPackage } from "../utils/crypto";
import { scanSpineWithWebcam } from "../utils/webcam";

export type UnpackOptions = {
  file?: string;
  out?: string;
  key?: string;
};

export async function unpackCommand(
  options: UnpackOptions = {},
): Promise<void> {
  intro(pc.bgMagenta(pc.black(" JRNL - Unpack & Decrypt ")));

  if (!options.file) {
    log.error(
      "Target .jrnl file path required.\nUsage: jrnl unpack <file.jrnl> [--key <key>] [--out <dir>]",
    );
    process.exit(1);
  }

  const filePath = resolvePath(options.file);
  if (!existsSync(filePath)) {
    log.error(`File not found: ${pc.dim(filePath)}`);
    process.exit(1);
  }

  log.info(`Target archive: ${pc.dim(filePath)}`);

  const data = readFileSync(filePath);
  const parsed = parseJrnlPackage(data);

  const checkSummary = [
    `  ${pc.bold("Magic Header")}     : ${pc.green("✓ Valid")}`,
    `  ${pc.bold("Manifest SHA-256")} : ${parsed.manifestValid ? pc.green("✓ VALID") : pc.red("✗ CORRUPTED")}`,
    `  ${pc.bold("Payload SHA-256")}  : ${parsed.bodyValid ? pc.green("✓ VALID") : pc.red("✗ CORRUPTED")}`,
    `  ${pc.bold("Archive Size")}     : ${pc.cyan(filesize(data.length))}`,
  ].join("\n");

  note(checkSummary, `Container Verification: ${basename(filePath)}`);

  if (!parsed.manifestValid || !parsed.bodyValid) {
    log.error(pc.red("Integrity verification failed. Archive is corrupt."));
    process.exit(1);
  }

  try {
    const manifestObj = JSON.parse(parsed.manifest.toString("utf8")) as Record<
      string,
      unknown
    >;
    const metadataLines = [
      `  ${pc.bold("Volume")}     : ${pc.cyan(`#${manifestObj.volume ?? "N/A"}`)}`,
      `  ${pc.bold("Date Range")} : ${pc.yellow(`${manifestObj.startDate ?? "?"} → ${manifestObj.endDate ?? "?"}`)}`,
    ].join("\n");
    note(metadataLines, "Volume Details");
  } catch {
    log.warn("Could not parse manifest JSON.");
  }

  const s = spinner();
  let decryptionKey = options.key;

  if (!decryptionKey) {
    s.start(
      "Archive is encrypted. Please hold the journal spine to the webcam...",
    );
    try {
      const spine = await scanSpineWithWebcam();
      decryptionKey = spine.key;
      s.stop(pc.green(`Key captured from Vol. #${spine.volume}`));
    } catch (err) {
      s.stop(pc.red("Webcam key scan failed."));
      log.error((err as Error).message);
      process.exit(1);
    }
  }

  s.start(
    `Decrypting ${pc.cyan(filesize(parsed.body.length))} payload with AES-256-GCM...`,
  );
  await new Promise((r) => setTimeout(r, 40));

  let bodyTarBuffer: Buffer;
  try {
    bodyTarBuffer = decryptAesGcm(parsed.body, decryptionKey);
  } catch (err) {
    s.stop(pc.red("Decryption failed. Invalid key or corrupt payload."));
    process.exit(1);
  }

  const defaultOutDir = filePath.endsWith(".jrnl")
    ? filePath.slice(0, -5)
    : `${filePath}_extracted`;

  const outDir = options.out ? resolvePath(options.out) : defaultOutDir;
  mkdirSync(outDir, { recursive: true });
  const bodyPath = join(outDir, "temp_body.tar.gz");
  writeFileSync(bodyPath, bodyTarBuffer);

  s.message("Extracting archive files...");

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("tar", ["-xzf", bodyPath, "-C", outDir], {
      stdio: "ignore",
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Extracting tar.gz failed with code ${code}`));
    });
    proc.on("error", (err) => reject(err));
  }).catch((err) => {
    s.stop(pc.red("Extraction failed."));
    rmSync(bodyPath, { force: true });
    log.error((err as Error).message);
    process.exit(1);
  });

  rmSync(bodyPath, { force: true });
  s.stop(
    pc.green(
      `Payload decrypted and extracted (${pc.bold(filesize(bodyTarBuffer.length))})`,
    ),
  );

  log.success(`Extracted files to: ${pc.cyan(outDir)}`);
  outro(pc.green("Journal successfully unpacked!"));
}
