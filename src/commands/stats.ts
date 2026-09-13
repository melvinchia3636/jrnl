import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { intro, outro, note, log } from "@clack/prompts";
import pc from "picocolors";
import { getJournalDir } from "../config";

export type PageWordCount = {
  file: string;
  words: number;
  characters: number;
};

export type JournalStats = {
  pages: PageWordCount[];
  totalWords: number;
  totalCharacters: number;
  averageWordsPerPage: number;
};

export function countWordsInText(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function calculateJournalStats(textsDir: string): JournalStats {
  if (!existsSync(textsDir)) {
    return {
      pages: [],
      totalWords: 0,
      totalCharacters: 0,
      averageWordsPerPage: 0,
    };
  }

  const files = readdirSync(textsDir)
    .filter((f) => f.endsWith(".txt"))
    .filter((f) => statSync(join(textsDir, f)).isFile())
    .sort();

  let totalWords = 0;
  let totalCharacters = 0;

  const pages: PageWordCount[] = files.map((f) => {
    const text = readFileSync(join(textsDir, f), "utf8");
    const words = countWordsInText(text);
    const characters = text.length;
    totalWords += words;
    totalCharacters += characters;
    return { file: f, words, characters };
  });

  const averageWordsPerPage = pages.length > 0 ? Math.round(totalWords / pages.length) : 0;

  return {
    pages,
    totalWords,
    totalCharacters,
    averageWordsPerPage,
  };
}

export type StatsOptions = {
  dir?: string;
};

export async function statsCommand(options: StatsOptions = {}): Promise<void> {
  intro(pc.bgGreen(pc.black(" JRNL — Statistics ")));

  const baseDir = getJournalDir(options.dir);
  const textsDir = existsSync(join(baseDir, "texts"))
    ? join(baseDir, "texts")
    : existsSync(join(baseDir, "ocr"))
      ? join(baseDir, "ocr")
      : baseDir;

  const stats = calculateJournalStats(textsDir);

  if (stats.pages.length === 0) {
    log.warn(`No .txt transcription files found in ${pc.dim(textsDir)}`);
    outro(pc.yellow("No transcripts to analyze."));
    return;
  }

  const pageLines = stats.pages
    .map((p) => `  ${pc.bold(p.file.padEnd(16))} : ${pc.cyan(String(p.words).padStart(5))} words ${pc.dim(`(${p.characters} chars)`)}`)
    .join("\n");

  const summary = [
    pageLines,
    pc.dim("─".repeat(42)),
    `  ${pc.bold("Total Pages")}       : ${pc.cyan(String(stats.pages.length))}`,
    `  ${pc.bold("Total Words")}       : ${pc.green(stats.totalWords.toLocaleString())} words`,
    `  ${pc.bold("Total Characters")}  : ${pc.yellow(stats.totalCharacters.toLocaleString())} chars`,
    `  ${pc.bold("Average Words/Page")}: ${pc.magenta(String(stats.averageWordsPerPage))} words`,
  ].join("\n");

  note(summary, `Metrics: ${textsDir}`);
  outro(pc.green("Stats analysis complete."));
}
