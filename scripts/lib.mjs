import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DIST = join(ROOT, 'dist');

export const PAGES = [
  { id: 'home', file: join(DIST, 'index.html'), path: '/' },
  { id: 'photo', file: join(DIST, 'remove-metadata-from-photo', 'index.html'), path: '/remove-metadata-from-photo/' },
  { id: 'pricing', file: join(DIST, 'pricing', 'index.html'), path: '/pricing/' },
];

export function readPage(file) {
  if (!existsSync(file)) throw new Error(`Missing build output: ${file}. Run astro build first.`);
  return readFileSync(file, 'utf8');
}

export function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function mainContent(html) {
  return html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? html;
}

export function visibleText(html) {
  return stripTags(mainContent(html));
}

export function wordCount(text) {
  return text.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

export function jsonLdBlocks(html) {
  const blocks = [];
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html))) {
    blocks.push(JSON.parse(match[1]));
  }
  return blocks;
}

export function graphOf(html) {
  return jsonLdBlocks(html).flatMap((block) => block['@graph'] ?? []);
}

export function titleOf(html) {
  return html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
}

export function h1Of(html) {
  return stripTags(html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? '');
}

export function bodyWithoutHeaderFooter(html) {
  return html.replace(/<header[\s\S]*?<\/header>/g, '').replace(/<footer[\s\S]*?<\/footer>/g, '');
}

let failures = 0;
export function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS ${label}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

export function finish(name) {
  if (failures > 0) {
    console.error(`${name}: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log(`${name}: all checks passed`);
}

export function walk(dir, ext) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (!ext || entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}
