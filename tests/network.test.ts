import { describe, expect, it } from "bun:test";
import { createServer } from "node:net";
import { extractHostname, isHostReachable } from "../src/utils/network";

describe("Network Utilities", () => {
  it("extracts hostname from user@host strings or plain hosts", () => {
    expect(extractHostname("raspi@raspi.local")).toBe("raspi.local");
    expect(extractHostname("user@192.168.1.100")).toBe("192.168.1.100");
    expect(extractHostname("192.168.1.100")).toBe("192.168.1.100");
    expect(extractHostname("localhost")).toBe("localhost");
  });

  it("returns false for unreachable host or closed port", async () => {
    // 59999 is typically unused
    const reachable = await isHostReachable("127.0.0.1", 59999, 100);
    expect(reachable).toBe(false);
  });

  it("returns true when TCP port is open and reachable", async () => {
    const reachable = await new Promise<boolean>((resolve) => {
      const server = createServer();
      server.listen(0, "127.0.0.1", async () => {
        const address = server.address();
        const port = typeof address === "object" && address ? address.port : 0;
        try {
          const res = await isHostReachable("127.0.0.1", port, 1000);
          server.close(() => resolve(res));
        } catch {
          server.close(() => resolve(false));
        }
      });
    });

    expect(reachable).toBe(true);
  });
});
