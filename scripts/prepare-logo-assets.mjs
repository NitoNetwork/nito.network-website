import sharp from "sharp";
import { copyFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const source = resolve(process.argv[2]);
const exportDirectory = process.argv[3] && resolve(process.argv[3]);
const media = resolve("public/media");
const metadata = await sharp(source).metadata();
if (metadata.width !== 1254 || metadata.height !== 1254 || !metadata.hasAlpha)
  throw new Error("Expected the approved transparent 1254px square master");

await mkdir(media, { recursive: true });
if (source !== join(media, "nito-blocks.png"))
  await copyFile(source, join(media, "nito-blocks.png"));
for (const size of [16, 32, 48, 64, 128, 256, 1024])
  await sharp(source)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(media, `nito-blocks-${size}.png`));
for (const size of [320, 640, 1024]) {
  await sharp(source)
    .resize(size, size)
    .webp({ quality: 84, effort: 6 })
    .toFile(join(media, `nito-blocks-${size}.webp`));
  await sharp(source)
    .resize(size, size)
    .avif({ quality: 52, effort: 6 })
    .toFile(join(media, `nito-blocks-${size}.avif`));
}
if (exportDirectory) {
  await mkdir(exportDirectory, { recursive: true });
  for (const suffix of [
    "",
    "-16",
    "-32",
    "-48",
    "-64",
    "-128",
    "-256",
    "-1024",
  ])
    await copyFile(
      join(media, `nito-blocks${suffix}.png`),
      join(exportDirectory, `nito-blocks${suffix}.png`),
    );
}
console.log(
  "Prepared the transparent master, seven PNG sizes and six web variants.",
);
