import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPng(width, height, pixelFn) {
  const bytesPerPixel = 4; // RGBA
  const rowBytes = width * bytesPerPixel;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = Buffer.concat([
    Buffer.from('IHDR'),
    ihdrData
  ]);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(ihdrChunk), 0);
  const ihdrFull = Buffer.concat([
    Buffer.alloc(4),
    ihdrChunk,
    ihdrCrc
  ]);
  ihdrFull.writeUInt32BE(13, 0);

  // IDAT chunk
  const idatTypeAndData = Buffer.concat([
    Buffer.from('IDAT'),
    compressed
  ]);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(idatTypeAndData), 0);
  const idatFull = Buffer.concat([
    Buffer.alloc(4),
    idatTypeAndData,
    idatCrc
  ]);
  idatFull.writeUInt32BE(compressed.length, 0);

  // IEND chunk
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendFull = Buffer.concat([
    Buffer.alloc(4), // length 0
    iendType,
    iendCrc
  ]);

  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([pngSig, ihdrFull, idatFull, iendFull]);
}

// Draw VKU Field Survey Icon: Theme #0284c7 with clipboard and checkmark design
function drawVkuIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background rounded rect #0284c7 (r: 2, g: 132, b: 199)
  // Let's create a subtle vertical gradient from #0369a1 to #0284c7
  const cornerRadius = 0.2;
  const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - cornerRadius));
  const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - cornerRadius));
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > cornerRadius) {
    return [0, 0, 0, 0]; // Transparent outside rounded corner
  }

  // Base background color
  const bgR = Math.round(2 + ny * 10);
  const bgG = Math.round(132 - ny * 15);
  const bgB = Math.round(199 - ny * 20);

  // Clipboard body: center horizontally [0.26, 0.74], vertically [0.22, 0.82]
  const isClipboard = (nx >= 0.26 && nx <= 0.74 && ny >= 0.22 && ny <= 0.82);
  // Clipboard clip header: center [0.38, 0.62], [0.15, 0.26]
  const isClip = (nx >= 0.38 && nx <= 0.62 && ny >= 0.15 && ny <= 0.26);

  if (isClip) {
    // Silver / dark blue metallic clip
    return [241, 245, 249, 255];
  }

  if (isClipboard) {
    // White card with inner content
    // Lines and checkmark
    // Line 1: [0.34, 0.66], ny [0.36, 0.39]
    if (ny >= 0.36 && ny <= 0.39 && nx >= 0.34 && nx <= 0.66) {
      return [2, 132, 199, 255]; // Blue line
    }
    // Line 2: [0.34, 0.58], ny [0.44, 0.47]
    if (ny >= 0.44 && ny <= 0.47 && nx >= 0.34 && nx <= 0.58) {
      return [148, 163, 184, 255]; // Gray line
    }
    // Checkmark area: circle around [0.5, 0.63]
    const checkCx = 0.5;
    const checkCy = 0.62;
    const cDist = Math.sqrt((nx - checkCx) ** 2 + (ny - checkCy) ** 2);
    if (cDist <= 0.12) {
      // Circle background green/emerald #10b981
      return [16, 185, 129, 255];
    }
    // Checkmark tick inside circle
    return [255, 255, 255, 255]; // White paper body
  }

  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, drawVkuIcon));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, drawVkuIcon));
console.log('Icons generated successfully: icon-192.png & icon-512.png');
