import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const RASTER_RE = /\.(png|jpe?g)$/i;

/**
 * Generate a `.webp` sibling for every raster image in `dir`, skipping any that
 * are already up-to-date. Sharp is imported lazily and failures are non-fatal,
 * so a missing/broken sharp install degrades to "no WebP" rather than breaking
 * the build (the <Image> primitive falls back to the original raster).
 */
async function generateWebp(dir: string) {
  let sharp: typeof import("sharp").default;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.warn("[image-webp] sharp unavailable — skipping WebP generation");
    return;
  }

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }

  for (const name of entries) {
    if (!RASTER_RE.test(name)) continue;
    const input = path.join(dir, name);
    const output = path.join(dir, name.replace(RASTER_RE, ".webp"));
    try {
      const srcStat = fs.statSync(input);
      if (fs.existsSync(output) && fs.statSync(output).mtimeMs >= srcStat.mtimeMs) {
        continue; // already up-to-date
      }
      const buffer = await sharp(input).webp({ quality: 82 }).toBuffer();
      fs.writeFileSync(output, buffer);
      console.log(`[image-webp] ${name} -> ${path.basename(output)}`);
    } catch (err) {
      console.warn(`[image-webp] failed for ${name}: ${(err as Error).message}`);
    }
  }
}

/**
 * Vite plugin that emits compressed WebP siblings beside the raster images in a
 * directory (the publicDir). Runs on `vite build` and on dev-server start, so
 * the generated `.webp` files are copied into the build output and served in dev
 * without manual upkeep — adding a new PNG/JPEG is enough.
 */
export function imageWebpPlugin(options: { dir: string }): Plugin {
  return {
    name: "zapp-image-webp",
    async buildStart() {
      await generateWebp(options.dir);
    },
  };
}
