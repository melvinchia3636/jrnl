import { mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { intro, outro, log } from "@clack/prompts";
import pc from "picocolors";
import { getJournalDir } from "../config";

export type GroupResult = {
  movedImages: number;
  movedTexts: number;
  pdfKept: number;
  skipped: string[];
};

export function organizeJournalFiles(dir: string): GroupResult {
  const files = readdirSync(dir)
    .filter((f) => !f.startsWith("."))
    .filter((f) => statSync(join(dir, f)).isFile())
    .sort();

  const imagesDir = join(dir, "images");
  const textsDir = join(dir, "texts");
  mkdirSync(imagesDir, { recursive: true });
  mkdirSync(textsDir, { recursive: true });

  let movedImages = 0;
  let movedTexts = 0;
  let pdfKept = 0;
  const skipped: string[] = [];

  for (const f of files) {
    const lower = f.toLowerCase();
    if (
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".webp")
    ) {
      renameSync(join(dir, f), join(imagesDir, f));
      movedImages++;
    } else if (lower.endsWith(".txt")) {
      renameSync(join(dir, f), join(textsDir, f));
      movedTexts++;
    } else if (lower.endsWith(".pdf")) {
      pdfKept++;
    } else {
      skipped.push(f);
    }
  }

  return { movedImages, movedTexts, pdfKept, skipped };
}

export type GroupOptions = {
  dir?: string;
};

export async function groupCommand(options: GroupOptions = {}): Promise<void> {
  intro(pc.bgBlue(pc.black(" JRNL - Organizer ")));

  const dir = getJournalDir(options.dir);
  log.info(`Target folder: ${pc.dim(dir)}`);

  const result = organizeJournalFiles(dir);

  log.step(
    `Moved ${pc.cyan(String(result.movedImages))} image(s) ➔ ${pc.bold("images/")}`,
  );
  log.step(
    `Moved ${pc.cyan(String(result.movedTexts))} text file(s) ➔ ${pc.bold("texts/")}`,
  );

  if (result.pdfKept > 0) {
    log.step(pc.dim(`Kept ${result.pdfKept} PDF(s) at root`));
  }

  if (result.skipped.length > 0) {
    log.warn(`Skipped ${result.skipped.length} unrecognized file(s):`);
    result.skipped.forEach((f) => log.message(pc.dim(`  - ${f}`)));
  }

  outro(pc.green("Folder organization complete."));
}
