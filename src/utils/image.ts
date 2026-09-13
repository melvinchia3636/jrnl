import { spawnSync } from "node:child_process";

export function resizeImage(src: string, dest: string, maxEdge: number = 1600): void {
  const res = spawnSync(
    "magick",
    [
      src,
      "-resize",
      `${maxEdge}>`,
      "-colorspace",
      "sRGB",
      "-quality",
      "90",
      dest,
    ],
    { stdio: "ignore" },
  );
  if (res.status !== 0) {
    throw new Error(`ImageMagick resize failed for ${src}`);
  }
}

export function rotateImage(src: string, dest: string, degrees: number = -90): void {
  const res = spawnSync(
    "magick",
    [
      src,
      "-rotate",
      String(degrees),
      dest,
    ],
    { stdio: "ignore" },
  );
  if (res.status !== 0) {
    throw new Error(`ImageMagick rotation failed for ${src}`);
  }
}
