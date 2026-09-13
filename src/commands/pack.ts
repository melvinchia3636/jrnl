import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawn } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { filesize } from "filesize";
import { intro, outro, spinner, note, log } from "@clack/prompts";
import pc from "picocolors";
import { getJournalDir, resolvePath } from "../config";
import { createJrnlPackage, encryptAesGcm, sha256 } from "../utils/crypto";
import { scanSpineWithWebcam } from "../utils/webcam";

export type PackOptions = {
  dir?: string;
  out?: string;
};

export async function packCommand(options: PackOptions = {}): Promise<void> {
  intro(pc.bgYellow(pc.black(" JRNL - Pack & Encrypt ")));

  const dir = getJournalDir(options.dir);
  const manifestPath = join(dir, "manifest.json");

  log.info(`Target journal: ${pc.dim(dir)}`);

  const s = spinner();
  s.start("Webcam active. Please hold the journal spine to the camera...");

  let spine;
  try {
    spine = await scanSpineWithWebcam();
    s.stop(pc.green("Spine Data Matrix recognized!"));
  } catch (err) {
    s.stop(pc.red("Webcam scan failed."));
    log.error((err as Error).message);
    process.exit(1);
  }

  const spineInfo = [
    `  ${pc.bold("Volume")}     : ${pc.cyan(`#${spine.volume}`)}`,
    `  ${pc.bold("Date Range")} : ${pc.yellow(`${spine.startDate} → ${spine.endDate}`)}`,
    `  ${pc.bold("Key Length")} : ${pc.dim(`${spine.key.length} characters`)}`,
  ].join("\n");

  note(spineInfo, "Spine Metadata Extracted");

  const manifestObj = {
    volume: spine.volume,
    startDate: spine.startDate,
    endDate: spine.endDate,
  };

  const manifestBuffer = Buffer.from(
    JSON.stringify(manifestObj, null, 2) + "\n",
    "utf8",
  );
  writeFileSync(manifestPath, manifestBuffer);

  const tmpDir = join(dir, ".jrnl_tmp");
  mkdirSync(tmpDir, { recursive: true });
  const tarPath = join(tmpDir, "body.tar.gz");

  s.start("Compressing journal pages (tar.gz)...");

  await new Promise<void>((resolve, reject) => {
    const tar = spawn(
      "tar",
      [
        "-czf",
        tarPath,
        "--exclude",
        ".DS_Store",
        "--exclude",
        ".jrnl_tmp",
        "--exclude",
        ".ocr_work",
        "--exclude",
        "*.jrnl",
        "-C",
        dir,
        ".",
      ],
      { stdio: "ignore" },
    );

    tar.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Tar archiving failed with exit code ${code}`));
    });

    tar.on("error", (err) => reject(err));
  }).catch((err) => {
    s.stop(pc.red("Archiving failed."));
    rmSync(tmpDir, { recursive: true, force: true });
    log.error((err as Error).message);
    process.exit(1);
  });

  const rawTarStat = statSync(tarPath);
  s.message(
    `Encrypting ${pc.cyan(filesize(rawTarStat.size))} archive with AES-256-GCM...`,
  );

  // Yield a tick so spinner renders the new message smoothly
  await new Promise((r) => setTimeout(r, 50));

  const rawTarBuffer = readFileSync(tarPath);
  const encryptedBodyBuffer = encryptAesGcm(rawTarBuffer, spine.key);

  s.message("Writing sealed .jrnl container to disk...");
  await new Promise((r) => setTimeout(r, 30));

  const jrnlBuffer = createJrnlPackage(manifestBuffer, encryptedBodyBuffer);

  const defaultFileName = `JRNL-VOL-${String(spine.volume).padStart(2, "0")}.jrnl`;
  const outPath = options.out
    ? resolvePath(options.out)
    : join(dirname(dir), defaultFileName);

  writeFileSync(outPath, jrnlBuffer);
  rmSync(tmpDir, { recursive: true, force: true });

  s.stop(
    pc.green(
      `Archive encrypted and sealed (${pc.bold(filesize(jrnlBuffer.length))})`,
    ),
  );

  const manifestHash = sha256(manifestBuffer).toString("hex");
  const tarHash = sha256(encryptedBodyBuffer).toString("hex");

  const archiveDetails = [
    `  ${pc.bold("Destination")}     : ${pc.cyan(outPath)}`,
    `  ${pc.bold("Total Size")}      : ${pc.green(filesize(jrnlBuffer.length))}`,
    `  ${pc.bold("Cipher")}          : ${pc.yellow("AES-256-GCM (Authenticated)")}`,
    `  ${pc.bold("Manifest SHA-256")}: ${pc.dim(manifestHash)}`,
    `  ${pc.bold("Payload SHA-256")} : ${pc.dim(tarHash)}`,
  ].join("\n");

  note(archiveDetails, "Container Summary");
  outro(pc.green(`Journal Vol. #${spine.volume} packaged and sealed!`));
}
