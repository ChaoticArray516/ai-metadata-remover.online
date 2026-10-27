import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const BUILD_TIME = new Date().toISOString();
const lastmod = BUILD_TIME.slice(0, 10);
const file = join(DIST, 'sitemap.xml');
const xml = readFileSync(file, 'utf8');
writeFileSync(file, xml.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${lastmod}</lastmod>`));
console.log(`sitemap lastmod stamped to ${lastmod} (BUILD_TIME=${BUILD_TIME})`);
