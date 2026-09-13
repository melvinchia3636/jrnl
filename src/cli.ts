#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { intro, outro, note, log } from "@clack/prompts";
import pc from "picocolors";
import { scanCommand } from "./commands/scan";
import { ocrCommand } from "./commands/ocr";
import { groupCommand } from "./commands/group";
import { statsCommand } from "./commands/stats";
import { packCommand } from "./commands/pack";
import { unpackCommand } from "./commands/unpack";
import { verifyCommand } from "./commands/verify";

function printHelp(): void {
  intro(pc.bgCyan(pc.black(" JRNL — Journal Scanner & Archival Suite ")));

  const usageText = [
    `${pc.bold("Usage:")} jrnl <command> [directory|file] [options]`,
    "",
    pc.bold("Commands:"),
    `  ${pc.cyan("scan")} [dir]            Scan physical pages via SSH (press Enter to repeat)`,
    `  ${pc.cyan("ocr")} [dir]             Transcribe scanned images using Gemini OCR`,
    `  ${pc.cyan("group")} [dir]           Organize directory into images/ and texts/`,
    `  ${pc.cyan("stats")} [dir]           Display word count and page statistics`,
    `  ${pc.cyan("pack")} [dir]            Package & Encrypt journal (scans spine Data Matrix via webcam)`,
    `  ${pc.cyan("verify")} <file.jrnl>    Fast SHA-256 integrity validation & metadata check`,
    `  ${pc.cyan("unpack")} <file.jrnl>    Scan spine key via webcam & extract archive`,
    "",
    pc.bold("Options:"),
    `  ${pc.yellow("-d, --dir")} <path>      Target journal directory (or set $JOURNAL_DIR)`,
    `  ${pc.yellow("-o, --out")} <path>      Output destination for archive or extraction`,
    `  ${pc.yellow("-f, --file")} <path>     Path to .jrnl container`,
    `  ${pc.yellow("-k, --key")} <key>       Optional decryption key override for unpack`,
    `  ${pc.yellow("-h, --host")} <host>     SSH host for scanner (default: $SSH_HOST or raspi@raspi.local)`,
    `  ${pc.yellow("-p, --pass")} <pass>     SSH password for scanner (default: $SSH_PASS)`,
    `  ${pc.yellow("    --force")}           Force re-OCR already transcribed pages`,
    `  ${pc.yellow("    --once")}            Scan a single page and exit immediately`,
    "",
    pc.bold("Spine Data Matrix Standard:"),
    `  ${pc.green("<volume>,<startDate>,<endDate>,<encryptionKey>")}`,
    `  Example: ${pc.dim("3,2026-06-01,2026-06-14,XSLCGOMI041IQNUY")}`,
  ].join("\n");

  note(usageText, "Command & Options Reference");
  outro(pc.dim("Set GEMINI_API_KEY, SSH_HOST, SSH_PASS, and JOURNAL_DIR in .env for fast workflows."));
}

export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }

  const { values, positionals } = parseArgs({
    args: args.slice(1),
    options: {
      dir: { type: "string", short: "d" },
      out: { type: "string", short: "o" },
      file: { type: "string", short: "f" },
      host: { type: "string", short: "h" },
      pass: { type: "string", short: "p" },
      key: { type: "string", short: "k" },
      force: { type: "boolean" },
      once: { type: "boolean" },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    return;
  }

  const targetDir = values.dir || positionals[0];

  try {
    switch (command.toLowerCase()) {
      case "scan":
        await scanCommand({
          host: values.host,
          pass: values.pass,
          dir: targetDir,
          once: values.once,
        });
        break;
      case "ocr":
        await ocrCommand({ dir: targetDir, force: values.force });
        break;
      case "group":
        await groupCommand({ dir: targetDir });
        break;
      case "stats":
      case "wordcount":
        await statsCommand({ dir: targetDir });
        break;
      case "pack":
      case "package":
        await packCommand({
          dir: targetDir,
          out: values.out,
        });
        break;
      case "unpack":
        await unpackCommand({
          file: values.file || positionals[0],
          out: values.out,
          key: values.key,
        });
        break;
      case "verify":
      case "check":
        await verifyCommand({
          file: values.file || positionals[0],
        });
        break;
      default:
        log.error(`Unknown command: "${command}"\nRun 'jrnl help' for available commands.`);
        process.exit(1);
    }
  } catch (error) {
    log.error((error as Error).message);
    process.exit(1);
  }
}

if (import.meta.main) {
  runCli();
}
