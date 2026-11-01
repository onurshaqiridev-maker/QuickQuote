/**
 * Makes simple PNG images (colour gradients) for the demo businesses, without any image library.
 * A PNG file = a signature + "chunks": IHDR (size), IDAT (compressed pixels), IEND.
 */
import { crc32, deflateSync } from 'node:zlib';

type Rgb = [number, number, number];

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** A diagonal gradient from colour `from` to colour `to`, with a soft circle for some depth. */
export function gradientPng(width: number, height: number, from: Rgb, to: Rgb): Buffer {
  const rowLength = width * 3 + 1;
  const pixels = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y += 1) {
    pixels[y * rowLength] = 0; // filter type "none"
    for (let x = 0; x < width; x += 1) {
      const t = (x + y) / (width + height);
      const dx = x - width * 0.72;
      const dy = y - height * 0.3;
      const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (Math.min(width, height) * 0.45)) * 40;
      const offset = y * rowLength + 1 + x * 3;
      for (let c = 0; c < 3; c += 1) pixels[offset + c] = Math.min(255, from[c] + (to[c] - from[c]) * t + glow);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per channel
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
