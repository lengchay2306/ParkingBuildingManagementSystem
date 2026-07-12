const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

/**
 * Minimal ZIP writer (DEFLATE) with forward-slash entry names.
 * PowerShell Compress-Archive writes `animations\\12345.json` which DotLottie rejects.
 */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const compressed = zlib.deflateRawSync(raw);
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    localParts.push(local, nameBuf, compressed);
    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, end]);
}

const gifDir = path.join('d:/PBMS/Mobile/src/components/gif');
const original = path.join(gifDir, 'car scan.lottie');
const extractDir = path.join(gifDir, '_rebuild');
fs.rmSync(extractDir, { recursive: true, force: true });
fs.mkdirSync(extractDir, { recursive: true });

const zipCopy = path.join(gifDir, '_rebuild_src.zip');
fs.copyFileSync(original, zipCopy);
execFileSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-Command',
    `Expand-Archive -Path '${zipCopy}' -DestinationPath '${extractDir}' -Force`,
  ],
  { stdio: 'inherit' },
);

const animFile = fs
  .readdirSync(path.join(extractDir, 'animations'))
  .map((name) => path.join(extractDir, 'animations', name))
  .find((p) => p.endsWith('.json'));

const anim = JSON.parse(fs.readFileSync(animFile, 'utf8'));
anim.ip = 6;
anim.op = 19;
anim.layers = (anim.layers || []).filter((layer) => {
  if (layer.nm === '形状图层 2') return false;
  if (typeof layer.ip === 'number' && layer.ip >= 19) return false;
  return true;
});

const outPath = path.join(gifDir, 'car-scan-loop.lottie');
const zipBuf = createZip([
  {
    name: 'manifest.json',
    data: JSON.stringify({
      animations: [{ id: '12345', mode: 'normal', direction: 1 }],
      author: 'PBMS',
      description: 'Car scan FAB loop frames 6-18',
      generator: 'pbms-trim',
      keywords: '',
      version: '1.0',
    }),
  },
  {
    name: 'animations/12345.json',
    data: JSON.stringify(anim),
  },
]);

fs.writeFileSync(outPath, zipBuf);

// verify names
const names = [];
let i = 0;
while (i + 30 < zipBuf.length) {
  if (zipBuf.readUInt32LE(i) !== 0x04034b50) break;
  const nameLen = zipBuf.readUInt16LE(i + 26);
  const extraLen = zipBuf.readUInt16LE(i + 28);
  const csize = zipBuf.readUInt32LE(i + 18);
  names.push(zipBuf.slice(i + 30, i + 30 + nameLen).toString());
  i += 30 + nameLen + extraLen + csize;
}
console.log('entries', names);
console.log('wrote', outPath, zipBuf.length);

fs.rmSync(extractDir, { recursive: true, force: true });
fs.unlinkSync(zipCopy);
