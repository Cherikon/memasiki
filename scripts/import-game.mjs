import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { i32, readGame, string, u16 } from './read-game.mjs';

const defaultFile = String.raw`D:\SteamLibrary\steamapps\common\МЕМАСИКИ\MEMASIKI4.dat`;
const out = fileURLToPath(new URL('../public/game/', import.meta.url));

function requireObject(frame, name) {
  const object = frame?.objects.find((entry) => entry.name === name);
  if (!object) throw new Error(`Missing object "${name}" in ${frame?.name ?? 'an absent frame'}`);
  return object;
}

function images(object) {
  const data = object.properties;
  const base = u16(data, 4);
  const handles = [];
  for (let index = 0; index < u16(data, base + 2); index++) {
    const offset = u16(data, base + 4 + index * 2);
    if (!offset) continue;
    const animation = base + offset;
    const direction = animation + u16(data, animation);
    for (let frame = 0; frame < u16(data, direction + 6); frame++) {
      handles.push(u16(data, direction + 8 + frame * 2));
    }
  }
  return handles;
}

function translation(object) {
  const data = object.properties;
  const base = u16(data, 36);
  const count = i32(data, base + 12);
  const paragraphs = Array.from({ length: count }, (_, index) => {
    const offset = base + i32(data, base + 16 + index * 4);
    return string(data, offset + 8).trim().replace(/\r\n/g, '\n');
  }).filter(Boolean);
  if (paragraphs.length !== 2) throw new Error(`Expected two translations for ${object.name}`);
  return paragraphs;
}

function pngChunk(tag, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const content = Buffer.concat([Buffer.from(tag), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(content));
  return Buffer.concat([length, content, crc]);
}

function encodeImage(data) {
  const width = u16(data, 12);
  const height = u16(data, 14);
  const alpha = data[17] === 16;
  const stride = (width + (width % 2)) * 3;
  const alphaStride = Math.ceil(width / 4) * 4;
  const alphaStart = 32 + stride * height;
  const pixelSize = 4;
  const rowSize = 1 + width * pixelSize;
  const rows = Buffer.alloc(rowSize * height);
  if (data[16] !== 4 || ![0, 16].includes(data[17]) ||
      data.length !== alphaStart + (alpha ? alphaStride * height : 0)) {
    throw new Error('Unsupported image data in this installation');
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = 32 + y * stride + x * 3;
      const dst = y * rowSize + 1 + x * pixelSize;
      const [blue, green, red] = [data[src], data[src + 1], data[src + 2]];
      const transparent = red === data[28] && green === data[29] && blue === data[30];
      rows[dst] = red;
      rows[dst + 1] = green;
      rows[dst + 2] = blue;
      rows[dst + 3] = alpha ? data[alphaStart + y * alphaStride + x] : transparent ? 0 : 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(rows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function exportImages(bank, wanted) {
  const pending = new Set(wanted);
  let offset = 4;
  for (let index = 0; index < i32(bank, 0); index++) {
    const handle = i32(bank, offset) - 1;
    const size = i32(bank, offset + 8);
    if (pending.delete(handle)) {
      const data = inflateSync(bank.subarray(offset + 12, offset + 12 + size));
      writeFileSync(join(out, `${handle}.png`), encodeImage(data));
    }
    offset += 12 + size;
  }
  if (pending.size) throw new Error(`Missing images: ${[...pending].join(', ')}`);
}

function exportSounds(bank) {
  const wanted = new Set(['vern', 'never']);
  let offset = 4;
  for (let index = 0; index < i32(bank, 0); index++) {
    const nameLength = i32(bank, offset + 24);
    const size = i32(bank, offset + 28);
    const data = inflateSync(bank.subarray(offset + 32, offset + 32 + size));
    const name = string(data);
    if (wanted.delete(name)) writeFileSync(join(out, `${name}.mp3`), data.subarray(nameLength * 2));
    offset += 32 + size;
  }
  if (wanted.size) throw new Error('Answer sound effects are missing');
}

try {
  const { frames, imageBank, soundBank } = readGame(process.argv[2] ?? defaultFile);
  const menu = frames.find(({ name }) => name === 'menu');
  const title = images(requireObject(menu, 'niou'))[0];
  const questionFrames = frames.filter(({ name }) => /^Frame \d+$/.test(name));
  const background = images(requireObject(questionFrames[0], 'fonbg'))[0];
  const questions = questionFrames.map((frame, index) => {
    const answers = ['vernaya', 'nevernaya', 'nevernaya 2', 'nevernaya 3'].map((name, id) => {
      const object = requireObject(frame, name);
      return { id, x: object.x, y: object.y, text: translation(object) };
    });
    answers.sort((a, b) => Math.round(a.y / 20) - Math.round(b.y / 20) || a.x - b.x);
    return {
      number: index + 1,
      image: images(requireObject(frame, 'imag'))[0],
      prompt: translation(requireObject(frame, 'vopros')),
      answers: answers.map(({ id, text }) => ({ correct: id === 0, text })),
    };
  });
  if (questions.length !== 50) throw new Error(`Expected 50 questions, found ${questions.length}`);

  const ranks = ['0_10', '11_20', '21_30', '31_40', '41_49', '50'].map((name) => ({
    max: Number(name.split('_').at(-1)),
    text: translation(requireObject(frames.find((frame) => frame.name === name), 'itog')),
  }));
  mkdirSync(out, { recursive: true });
  exportImages(imageBank, [title, background, ...questions.map(({ image }) => image)]);
  exportSounds(soundBank);
  writeFileSync(join(out, 'quiz.json'), JSON.stringify({ title, background, questions, ranks }));
  console.log(`Imported ${questions.length} original questions with images, translations and sounds.`);
} catch (error) {
  console.error(`Game import failed: ${error.message}`);
  process.exitCode = 1;
}
