import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { PAGES, DIST, readPage, check, finish } from './lib.mjs';

const FORBIDDEN_FIRST_SCREEN = /strip|exifr|report|heic|basic|compare|full\.esm|build\./i;
let totalApp = 0;
let totalAll = 0;

for (const page of PAGES) {
  const html = readPage(page.file);
  const sources = [
    ...[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((match) => match[1]),
    ...[...html.matchAll(/<link rel="modulepreload"[^>]*href="([^"]+)"/g)].map((match) => match[1]),
  ];
  check(`${page.id} no lazy chunk in first screen`, !sources.some((src) => FORBIDDEN_FIRST_SCREEN.test(src)), sources.join(','));
  let pageBytes = 0;
  for (const src of new Set(sources)) {
    const file = join(DIST, src.replace(/^\//, ''));
    const size = gzipSync(readFileSync(file)).length;
    pageBytes += size;
    console.log(`  ${page.id} first-screen ${src} = ${size}B gzip`);
  }
  console.log(`  ${page.id} first-screen app JS = ${pageBytes}B gzip`);
  check(`${page.id} first-screen app JS <= 30KB gzip`, pageBytes <= 30 * 1024, `${pageBytes}B`);
  totalApp = Math.max(totalApp, pageBytes);
  totalAll = Math.max(totalAll, pageBytes);
}

check('total first-screen JS <= 200KB gzip', totalAll <= 200 * 1024, `${totalAll}B`);
console.log(`worst page: app=${totalApp}B total=${totalAll}B`);

finish('check-budget');
