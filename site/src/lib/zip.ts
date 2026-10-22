import { gzipSync } from "node:zlib";
import { zipSync } from "fflate";

export type ArchiveFile = {
  /** Path inside the archive (posix, no leading slash). */
  path: string;
  data: Uint8Array;
};

/**
 * Fixed DOS local time. fflate reads mtime via local getters (getFullYear/…),
 * so Date.UTC(1980,…) shifts with TZ and America/* throws "date not in range".
 * `new Date(1980, 0, 1)` is local-midnight on purpose → stable zip bytes.
 */
const DOS_1980_01_01 = new Date(1980, 0, 1, 0, 0, 0);
/** Unix mode 0644 regular file in ZIP external attributes. */
const EXT_ATTR_0644 = (0o100644 << 16) >>> 0;
/** ZIP host OS = Unix so unzip honours Unix external attrs (not fat). */
const ZIP_OS_UNIX = 3;

function sortedFiles(files: ArchiveFile[]): ArchiveFile[] {
  return [...files].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
}

/** Deterministic zip: sorted entries, fixed DOS time, mode 0644, deflate 9. */
export function buildZip(files: ArchiveFile[]): Uint8Array {
  const zippable: Record<
    string,
    [
      Uint8Array,
      { level: number; mtime: Date; attrs: number; os: number },
    ]
  > = {};
  for (const f of sortedFiles(files)) {
    zippable[f.path] = [
      f.data,
      {
        level: 9,
        mtime: DOS_1980_01_01,
        attrs: EXT_ATTR_0644,
        os: ZIP_OS_UNIX,
      },
    ];
  }
  return zipSync(zippable, { level: 9 });
}

/** Write a deterministic ustar tar, then gzip (mtime 0, OS byte 255). */
export function buildTarGz(files: ArchiveFile[]): Uint8Array {
  const tar = buildUstar(sortedFiles(files));
  const gz = gzipSync(Buffer.from(tar), { level: 9, mtime: 0 });
  // Force OS = 255 (unknown) for cross-platform reproducibility
  gz[9] = 255;
  return new Uint8Array(gz);
}

function encodeOctal(value: number, length: number): string {
  const s = value.toString(8);
  if (s.length > length - 1) {
    throw new Error(`octal field overflow: ${value} needs ${length}`);
  }
  return s.padStart(length - 1, "0") + "\0";
}

function writeString(
  buf: Buffer,
  offset: number,
  value: string,
  length: number,
): void {
  buf.fill(0, offset, offset + length);
  buf.write(value, offset, Math.min(value.length, length), "utf8");
}

function checksum(header: Buffer): number {
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += header[i];
  return sum;
}

function buildUstar(files: ArchiveFile[]): Uint8Array {
  const chunks: Buffer[] = [];
  for (const file of files) {
    const name = file.path;
    if (name.length > 100) {
      throw new Error(`tar path too long (>100): ${name}`);
    }
    const data = Buffer.from(file.data);
    const header = Buffer.alloc(512, 0);
    writeString(header, 0, name, 100);
    writeString(header, 100, encodeOctal(0o644, 8), 8);
    writeString(header, 108, encodeOctal(0, 8), 8); // uid
    writeString(header, 116, encodeOctal(0, 8), 8); // gid
    writeString(header, 124, encodeOctal(data.length, 12), 12);
    writeString(header, 136, encodeOctal(0, 12), 12); // mtime
    // Checksum field must be spaces while summing (POSIX ustar)
    header.fill(0x20, 148, 156);
    header[156] = 0x30; // typeflag '0' regular file
    writeString(header, 257, "ustar", 6);
    writeString(header, 263, "00", 2);
    // uname / gname empty (already zeroed)
    const sum = checksum(header);
    const sumStr = sum.toString(8).padStart(6, "0");
    writeString(header, 148, sumStr, 6);
    header[154] = 0;
    header[155] = 0x20;

    chunks.push(header);
    chunks.push(data);
    const pad = (512 - (data.length % 512)) % 512;
    if (pad) chunks.push(Buffer.alloc(pad, 0));
  }
  // two zero blocks end marker
  chunks.push(Buffer.alloc(1024, 0));
  return Buffer.concat(chunks);
}
