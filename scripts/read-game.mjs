// Local reader for the Windows PAMU data used by MEMASIKI4.
// Format reference: https://github.com/Sergey004/ctfak-cpp/blob/master/docs/FORMAT_NOTES.md
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export const u16 = (data, offset) => data.readUInt16LE(offset);
export const i32 = (data, offset) => data.readInt32LE(offset);

export function string(data, start = 0) {
  let end = start;
  while (end + 1 < data.length && u16(data, end) !== 0) end += 2;
  return data.toString('utf16le', start, end);
}

function* chunks(data, offset = 0) {
  while (offset + 8 <= data.length) {
    const id = u16(data, offset);
    const flag = u16(data, offset + 2);
    const size = i32(data, offset + 4);
    offset += 8;
    if (size < 0 || offset + size > data.length) throw new Error('Invalid chunk length');
    yield { id, flag, bytes: data.subarray(offset, offset + size) };
    offset += size;
  }
}

const rotate = (value) => ((value << 7) | (value >> 1)) & 255;

function makeTable(strings) {
  const key = Buffer.alloc(256);
  const bytes = strings.flatMap((value) => [...Buffer.from(value, 'utf16le')].filter(Boolean));
  if (bytes.length >= 254) throw new Error('Unexpected key length');
  key.set(bytes);
  let value = 54;
  let last = 0;
  for (let index = 0; index <= bytes.length; index++) {
    value = rotate(value);
    key[index] ^= value;
    last += key[index] * ((value & 1) + 2);
  }
  key[bytes.length + 1] = last;
  const table = Uint8Array.from({ length: 256 }, (_, index) => index);
  let hash = 54;
  let cursor = 0;
  let swap = 0;
  for (let index = 0; index < table.length; index++, cursor++) {
    hash = rotate(hash);
    if (hash === key[cursor]) {
      hash = rotate(54);
      cursor = 0;
    }
    swap = (swap + (hash ^ key[cursor]) + table[index]) & 255;
    [table[index], table[swap]] = [table[swap], table[index]];
  }
  return table;
}

function decrypt(bytes, table) {
  const state = table.slice();
  let swap = 0;
  for (let index = 0; index < bytes.length; index++) {
    const cursor = (index + 1) & 255;
    swap = (swap + state[cursor]) & 255;
    [state[cursor], state[swap]] = [state[swap], state[cursor]];
    bytes[index] ^= state[(state[cursor] + state[swap]) & 255];
  }
  return bytes;
}

export function readGame(file) {
  const data = readFileSync(file);
  const start = data.indexOf('PAMU');
  if (start < 0 || i32(data, start + 12) !== 295) throw new Error('Expected MEMASIKI4.dat (Fusion build 295)');
  const top = [...chunks(data, start + 16)];
  const byId = new Map(top.map((chunk) => [chunk.id, chunk]));
  const plainString = (id) => {
    const chunk = byId.get(id);
    return chunk ? string(chunk.flag === 1 ? inflateSync(chunk.bytes.subarray(8)) : chunk.bytes) : '';
  };
  const table = makeTable([plainString(0x2224), plainString(0x223b), plainString(0x222e)]);
  const unpack = ({ id, flag, bytes }) => {
    if (flag === 0) return bytes;
    if (flag === 1) return inflateSync(bytes.subarray(8));
    if (flag === 2) return decrypt(Buffer.from(bytes), table);
    if (flag === 3) {
      const block = Buffer.from(bytes.subarray(4));
      if (id & 1) block[0] ^= (id & 255) ^ (id >> 8);
      return inflateSync(decrypt(block, table).subarray(4));
    }
    throw new Error(`Unknown chunk flag ${flag}`);
  };

  const objects = new Map();
  const objectBank = unpack(byId.get(0x2229));
  let object = {};
  for (const chunk of chunks(objectBank, 4)) {
    if (chunk.id === 0x4444) object.handle = u16(unpack(chunk), 0);
    if (chunk.id === 0x4445) object.name = string(unpack(chunk));
    if (chunk.id === 0x4446) object.properties = unpack(chunk);
    if (chunk.id === 0x7f7f) {
      objects.set(object.handle, object);
      object = {};
    }
  }

  const frames = top.filter(({ id }) => id === 0x3333).map((chunk) => {
    const frame = new Map([...chunks(unpack(chunk))].map((part) => [part.id, part]));
    const instances = unpack(frame.get(0x3338));
    return {
      name: string(unpack(frame.get(0x3335))),
      objects: Array.from({ length: i32(instances, 0) }, (_, index) => {
        const offset = 4 + index * 20;
        return {
          ...objects.get(u16(instances, offset + 2)),
          x: i32(instances, offset + 4),
          y: i32(instances, offset + 8),
        };
      }),
    };
  });
  return { frames, imageBank: unpack(byId.get(0x6666)), soundBank: unpack(byId.get(0x6668)) };
}
