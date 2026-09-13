import { createConnection } from "node:net";

export function extractHostname(hostString: string): string {
  if (hostString.includes("@")) {
    const parts = hostString.split("@");
    return parts[1] ?? hostString;
  }
  return hostString;
}

export function isHostReachable(
  hostString: string,
  port: number = 22,
  timeoutMs: number = 3000,
): Promise<boolean> {
  const host = extractHostname(hostString);
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}
