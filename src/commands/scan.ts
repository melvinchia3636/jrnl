import { spawnSync } from "node:child_process";
import { readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { intro, outro, spinner, log, confirm } from "@clack/prompts";
import pc from "picocolors";
import { getJournalDir, getSshHost, getSshPassword } from "../config";
import { isHostReachable, extractHostname } from "../utils/network";

export function getNextNumber(dir: string): number {
  const re = /^JRNL-(\d{4})\.png$/;
  let max = 0;
  try {
    for (const file of readdirSync(dir)) {
      const m = file.match(re);
      if (m) {
        const n = Number(m[1]);
        if (n > max) max = n;
      }
    }
  } catch {
    // directory may not exist yet
  }
  return max + 1;
}

export type ScanOptions = {
  host?: string;
  pass?: string;
  dir?: string;
  once?: boolean;
};

export async function scanCommand(options: ScanOptions = {}): Promise<void> {
  intro(pc.bgCyan(pc.black(" JRNL — Scanner ")));

  const host = getSshHost(options.host);
  const pass = getSshPassword(options.pass);
  const dir = getJournalDir(options.dir);
  const hostname = extractHostname(host);

  const s = spinner();
  s.start(`Checking SSH connection to ${pc.cyan(hostname)}:22...`);

  const reachable = await isHostReachable(host, 22, 3000);
  if (!reachable) {
    s.stop(pc.red(`Host ${hostname} is unreachable on port 22.`));
    log.error("Please verify the Raspberry Pi is powered on and on the same network.");
    process.exit(1);
  }

  s.stop(pc.green(`Host ${hostname} is online.`));
  mkdirSync(dir, { recursive: true });

  const scanCmd = [
    "sshpass",
    "-p",
    pass,
    "ssh",
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "ConnectTimeout=5",
    host,
    `'echo '${pass}' | sudo -S scanimage --format=pnm --mode Color --resolution 300'`,
  ].join(" ");

  while (true) {
    const num = getNextNumber(dir);
    const fileName = `JRNL-${String(num).padStart(4, "0")}.png`;
    const out = join(dir, fileName);

    s.start(`Scanning page #${num}...`);
    const res = spawnSync(`${scanCmd} | magick - -rotate -90 "${out}"`, {
      shell: true,
      stdio: "ignore",
    });

    if (res.status !== 0) {
      s.stop(pc.red(`Scan failed on page #${num}`));
      const retry = await confirm({ message: "Try scanning this page again?" });
      if (retry) continue;
      break;
    }

    s.stop(pc.green(`Captured ${pc.bold(fileName)}`));
    log.message(pc.dim(`Saved to: ${out}`));

    if (options.once) break;

    const next = await confirm({ message: "Scan next page?" });
    if (!next) break;
  }

  outro(pc.cyan("Scan session completed."));
}
