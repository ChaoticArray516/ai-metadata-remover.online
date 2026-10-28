import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES, DIST, ROOT, readPage, walk, check, finish } from './lib.mjs';

const FORBIDDEN = [
  /undetectable/i,
  /bypass/i,
  /beat detection/i,
  /100% safe/i,
  /guaranteed/i,
  /100% clean/i,
  /completely removed/i,
  /SB 1000/,
  /30 minutes/i,
];

for (const page of PAGES) {
  const html = readPage(page.file);
  for (const pattern of FORBIDDEN) {
    check(`${page.id} forbidden ${pattern}`, !pattern.test(html));
  }
  check(`${page.id} no {{ residue`, !html.includes('{{'));
}
const pricing = readPage(PAGES[2].file);
check('pricing no urgency marketing', !/limited time|only .* left|best deal/i.test(pricing));

const srcFiles = walk(join(ROOT, 'src')).filter((file) => /\.(ts|astro)$/.test(file));
for (const file of srcFiles) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length + 1);
  check(`${rel} no document.title`, !/document\.title/.test(text));
  check(`${rel} no checkout track call`, rel.endsWith('analytics.events.ts') || !/track\(\s*['"]checkout_/.test(text));
  check(`${rel} no exifr mini/lite`, !/exifr\/(mini|lite)/.test(text));
  check(`${rel} no head mutation`, !/querySelector\(\s*['"]meta|setAttribute\(\s*['"]href/.test(text) || rel.endsWith('schema.ts'));
  check(`${rel} no analytics SDK`, !/gtag|plausible|umami|posthog|mixpanel|fathom/.test(text));
  check(`${rel} no fetch to server`, !/fetch\(/.test(text));
}

const exifrImports = srcFiles.filter((file) => /from 'exifr'|import\('exifr'\)/.test(readFileSync(file, 'utf8')));
check('exifr single import point at inspect/full.ts',
  exifrImports.length === 1 && exifrImports[0].endsWith(join('inspect', 'full.ts')), exifrImports.join(','));

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const runtimePkgText = JSON.stringify(pkg.dependencies ?? {});
check('package.json no banned runtime deps',
  !/ffmpeg|exiftool|mupdf|ghostscript|libheif|pdf-lib|mediabunny|mp4box|c2pa|contentauth/.test(runtimePkgText));
const allowedBuildDeps = new Set(['typescript', 'piexifjs', 'png-chunks-extract', 'libheif-js']);
const devPkgText = JSON.stringify(Object.fromEntries(Object.entries(pkg.devDependencies ?? {})
  .filter(([name]) => !allowedBuildDeps.has(name))));
check('package.json no banned dev deps outside 3B build whitelist',
  !/ffmpeg|exiftool|mupdf|ghostscript|libheif|pdf-lib|mediabunny|mp4box|c2pa|contentauth/.test(devPkgText));

const headers = readFileSync(join(DIST, '_headers'), 'utf8');
check("CSP includes connect-src 'self'", headers.includes("connect-src 'self'"));

const reportTemplate = readFileSync(join(ROOT, 'src', 'lib', 'report', 'template.ts'), 'utf8');
const titleArea = reportTemplate.split('<h2>File</h2>')[0];
check('report title fixed', reportTemplate.includes('Metadata Cleaning Report'));
check('report title/conclusion no C2PA or Content Credentials',
  !/c2pa|content credential/i.test(titleArea.replace(/CONCLUSIONS[\s\S]*/, '')));
check('report no server retention wording',
  !/30 minutes|24 hours|automatically deleted/.test(reportTemplate));

for (const file of srcFiles) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length + 1);
  check(`${rel} no design-mock colors`, !/#2563EB|#111827|#F8FAFC/i.test(text));
  if (/\.astro$/.test(file)) {
    check(`${rel} no hardcoded hex colors in component`, !/#[0-9a-fA-F]{3,8}\b/.test(text));
  }
}

const uploader = readFileSync(join(ROOT, 'src', 'components', 'tool', 'uploader.ts'), 'utf8');
const toolBench = readFileSync(join(ROOT, 'src', 'components', 'tool', 'ToolBench.astro'), 'utf8');
for (const text of ['Reading your file…', 'Cleaning…', 'Preparing report…', 'Still working…', 'Choose one file at a time.']) {
  check(`state copy present: ${text}`, uploader.includes(text));
}
check('state copy present: Try a different file', toolBench.includes('Try a different file'));
check('empty fields copy present', readFileSync(join(ROOT, 'src', 'lib', 'inspect', 'basic.ts'), 'utf8')
  .includes('Nothing to show. This file did not carry these fields.'));
check('waitlist success has role=status', readFileSync(join(ROOT, 'src', 'components', 'monetize', 'WaitlistForm.astro'), 'utf8')
  .includes('role="status"'));
check('lock price targets pricing#waitlist', readFileSync(join(ROOT, 'src', 'components', 'monetize', 'ProCard.astro'), 'utf8')
  .includes("#waitlist`"));

finish('check-forbidden');
