import sharp from "sharp";

const [input, output] = process.argv.slice(2);

if (!input || !output) {
  console.error("Usage: node remove-chroma-key.mjs <input> <output>");
  process.exit(1);
}

const image = sharp(input).ensureAlpha();
const { width, height } = await image.metadata();
const pixels = await image.raw().toBuffer();

if (!width || !height) {
  throw new Error("Could not read image dimensions.");
}

const border = [];
const stride = width * 4;

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (x > 3 && x < width - 4 && y > 3 && y < height - 4) continue;
    const idx = y * stride + x * 4;
    border.push([pixels[idx], pixels[idx + 1], pixels[idx + 2]]);
  }
}

function median(channel) {
  const sorted = border.map((rgb) => rgb[channel]).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const key = [median(0), median(1), median(2)];
const transparentThreshold = 18;
const opaqueThreshold = 130;

for (let i = 0; i < pixels.length; i += 4) {
  const dr = pixels[i] - key[0];
  const dg = pixels[i + 1] - key[1];
  const db = pixels[i + 2] - key[2];
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);

  const greenDominance = pixels[i + 1] - Math.max(pixels[i], pixels[i + 2]);
  const isBackgroundGreen = pixels[i + 1] > 95 && greenDominance > 48;

  if (distance <= transparentThreshold || isBackgroundGreen) {
    pixels[i] = 0;
    pixels[i + 1] = 0;
    pixels[i + 2] = 0;
    pixels[i + 3] = 0;
  } else if (distance < opaqueThreshold || greenDominance > 18) {
    const distanceAlpha = ((distance - transparentThreshold) / (opaqueThreshold - transparentThreshold)) * 255;
    const dominanceAlpha = 255 - Math.max(0, greenDominance - 18) * 5;
    const alpha = Math.max(0, Math.min(255, Math.round(Math.min(distanceAlpha, dominanceAlpha))));
    pixels[i + 3] = Math.min(pixels[i + 3], alpha);

    const greenSpill = Math.max(0, greenDominance);
    pixels[i + 1] = Math.max(0, pixels[i + 1] - Math.round(greenSpill * (1 - alpha / 255) * 0.95));
  }
}

await sharp(pixels, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(output);

console.log(JSON.stringify({ width, height, key, output }));
