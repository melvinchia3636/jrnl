import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { getGeminiApiKey, getJournalDir } from "../config";
import { resizeImage } from "../utils/image";

const PROMPT = `You are a raw OCR transcription engine.

You are NOT an assistant.
You are NOT allowed to explain anything.
You are NOT allowed to add notes.
You are NOT allowed to describe the image.
You are NOT allowed to summarize.
You are NOT allowed to infer context.
You are NOT allowed to output metadata.
You are NOT allowed to add prefixes or suffixes.
You are NOT allowed to output markdown.
You are NOT allowed to output code fences.
You are NOT allowed to output warnings.
You are NOT allowed to output comments.

Your ONLY task is to transcribe visible text exactly as written.

IMPORTANT: Each image contains TWO PAGES, scanned one after another (arranged vertically). Transcribe the pages in order: transcribe the first page fully before moving on to the second page. Do not merge or skip pages, and do not add page labels.

For line breaks: do not follow the physical line breaks of the book. Only start a new line when a paragraph ends. Transcribe continuous prose as continuous text.

STRICT OUTPUT RULES:
- Output ONLY the transcription.
- Preserve original spelling mistakes.
- Preserve original line breaks.
- Preserve punctuation exactly.
- Do not complete unfinished words.
- Do not correct grammar.
- If text is unreadable, output [unclear].
- If no readable text exists, output an empty string.

Any output that is not part of the transcription is considered a failure.

Begin transcription now.`;

export type OcrOptions = {
  dir?: string;
  force?: boolean;
};

export async function ocrCommand(options: OcrOptions = {}): Promise<void> {
  intro(pc.bgMagenta(pc.black(" JRNL - OCR Transcriber ")));

  const apiKey = getGeminiApiKey();
  const client = new GoogleGenAI({ apiKey });

  const baseDir = getJournalDir(options.dir);
  const imagesSubDir = join(baseDir, "images");
  const sourceDir =
    existsSync(imagesSubDir) && statSync(imagesSubDir).isDirectory()
      ? imagesSubDir
      : baseDir;

  const validImageExts = [".png", ".jpg", ".jpeg", ".webp"];
  const imageFiles = readdirSync(sourceDir)
    .filter((f) => !f.startsWith("."))
    .filter((f) => {
      const lower = f.toLowerCase();
      return validImageExts.some((ext) => lower.endsWith(ext));
    })
    .filter((f) => statSync(join(sourceDir, f)).isFile())
    .sort();

  if (imageFiles.length === 0) {
    log.warn(`No image files found in ${pc.dim(sourceDir)}`);
    outro(pc.yellow("Nothing to transcribe."));
    return;
  }

  const outputDir = existsSync(join(baseDir, "texts"))
    ? join(baseDir, "texts")
    : baseDir;

  const workDir = join(baseDir, ".ocr_work");
  mkdirSync(workDir, { recursive: true });

  log.info(
    `Found ${pc.bold(String(imageFiles.length))} image(s) in ${pc.dim(sourceDir)}`,
  );

  const s = spinner();
  let processed = 0;

  let index = 0;
  for (const file of imageFiles) {
    index++;
    const stem = file.includes(".")
      ? file.slice(0, file.lastIndexOf("."))
      : file;

    const possibleTxtPaths = [
      join(outputDir, `${stem}.txt`),
      join(baseDir, "texts", `${stem}.txt`),
      join(baseDir, `${stem}.txt`),
    ];
    const existingTxtPath = possibleTxtPaths.find((p) => existsSync(p));
    const txtPath = existingTxtPath || join(outputDir, `${stem}.txt`);

    if (existingTxtPath && !options.force) {
      const existingText = readFileSync(existingTxtPath, "utf8");
      if (existingText.trim().length > 0) {
        log.step(
          pc.dim(
            `[${index}/${imageFiles.length}] Skipped ${file} (already transcribed)`,
          ),
        );
        continue;
      }
    }

    s.start(`[${index}/${imageFiles.length}] Transcribing ${pc.cyan(file)}...`);

    const resized = join(workDir, `${stem}.jpg`);
    try {
      resizeImage(join(sourceDir, file), resized);
    } catch (e) {
      s.stop(pc.red(`Resize failed for ${file}`));
      log.error(String(e));
      continue;
    }

    try {
      const imageBytes = readFileSync(resized);
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBytes.toString("base64"),
                },
              },
            ],
          },
        ],
      });

      const text = response.text ?? "";
      writeFileSync(txtPath, text, "utf8");
      s.stop(
        pc.green(
          `[${index}/${imageFiles.length}] Transcribed ${pc.bold(file)} (${text.length} chars)`,
        ),
      );
      processed++;
    } catch (e) {
      writeFileSync(txtPath, "", "utf8");
      s.stop(pc.red(`[${index}/${imageFiles.length}] Error on ${file}`));
      log.error(String(e));
    }
  }

  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {
    // cleanup
  }

  outro(pc.green(`Transcribed ${processed} new page(s).`));
}
