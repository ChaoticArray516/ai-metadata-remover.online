import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { PAGES, DIST, ROOT, readPage, mainContent, stripTags, graphOf, titleOf, h1Of, visibleText, wordCount, walk } from './lib.mjs';

const NEW = [
  { id: 'examples', path: '/examples/', file: join(DIST, 'examples', 'index.html'), title: 'Metadata Removal Examples — Before and After Files', h1: 'Metadata Removal Examples', graph: 3 },
  { id: 'cleaner', path: '/compare/vs-aimetadatacleaner/', file: join(DIST, 'compare', 'vs-aimetadatacleaner', 'index.html'), title: 'AI Metadata Remover vs AI Metadata Cleaner — Comparison', h1: 'AI Metadata Remover vs AI Metadata Cleaner', graph: 4 },
  { id: 'deletefootprints', path: '/compare/vs-deletefootprints/', file: join(DIST, 'compare', 'vs-deletefootprints', 'index.html'), title: 'AI Metadata Remover vs DeleteFootprints — Comparison', h1: 'AI Metadata Remover vs DeleteFootprints', graph: 4 },
  { id: 'exifremover', path: '/compare/vs-exifremover/', file: join(DIST, 'compare', 'vs-exifremover', 'index.html'), title: 'AI Metadata Remover vs EXIF Remover — Comparison', h1: 'AI Metadata Remover vs EXIF Remover', graph: 4 },
];
const html = Object.fromEntries(NEW.map((page) => [page.id, readPage(page.file)]));
const allPages = [...PAGES, ...NEW];
let failures = 0;
let assertions = 0;
function group(id, fn) {
  assertions++;
  try {
    fn();
    console.log(`  PASS ${id}`);
  } catch (error) {
    failures++;
    console.error(`  FAIL ${id} — ${error.message}`);
  }
}
const count = (text, needle) => text.split(needle).length - 1;
const classCount = (text, name) => (text.match(new RegExp(`class="[^"]*\\b${name}\\b`, 'g')) ?? []).length;
const linksOf = (text) => [...mainContent(text).matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  .map((match) => ({ href: match[1], anchor: stripTags(match[2]) }));
const executableScripts = (text) => [...text.matchAll(/<script\b([^>]*)>/g)]
  .filter((match) => !/type="application\/ld\+json"/.test(match[1])).length;
const bodyWords = (text) => {
  const body = mainContent(text)
    .replace(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/g, ' ')
    .replace(/<div class="table-wrap"[\s\S]*?<\/div>/g, ' ');
  return wordCount(stripTags(body));
};
const graphIds = (graph) => JSON.stringify(graph).match(/"@id"\s*:\s*"[^"]+"/g) ?? [];

group('01 routes, titles, H1, canonical and meta', () => {
  for (const page of NEW) {
    assert.equal(titleOf(html[page.id]), page.title, page.id);
    assert.equal(h1Of(html[page.id]), page.h1, page.id);
    assert(html[page.id].includes(`<link rel="canonical" href="https://ai-metadata-remover.online${page.path}"`), page.id);
    const meta = html[page.id].match(/<meta name="description" content="([^"]+)"/)?.[1] ?? '';
    if (page.id === 'examples') {
      assert.equal(meta, 'Eight synthetic files, cleaned in the browser. See every field we read before and after, which files had nothing to find, and what a clean report looks like.');
    } else {
      assert(meta.length >= 130 && meta.length <= 155, `${page.id} meta=${meta.length}`);
    }
  }
  assert(!/\bAI\b/i.test(titleOf(html.examples)) && !/\bAI\b/i.test(h1Of(html.examples)));
});
group('02 examples Schema and ItemList', () => {
  const graph = graphOf(html.examples);
  assert.equal(graph.length, 3);
  assert.equal(graph[0]['@type'], 'CollectionPage');
  const list = graph.find((node) => node['@type'] === 'ItemList');
  assert.equal(list.numberOfItems, 8);
  assert.equal(list.itemListElement.length, 8);
  const cards = [...html.examples.matchAll(/data-sample-id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(list.itemListElement.map((item) => item.name), cards);
  assert.equal(graph.find((node) => node['@type'] === 'BreadcrumbList').itemListElement.length, 2);
});
group('03 compare Schema, dates and two-level breadcrumbs', () => {
  for (const page of NEW.filter((item) => item.id !== 'examples')) {
    const graph = graphOf(html[page.id]);
    assert.equal(graph.length, 4, page.id);
    assert.equal(graph[0]['@type'], 'WebPage', page.id);
    assert.equal(graph[0].datePublished, '2026-10-27');
    assert.equal(graph[0].dateModified, '2026-10-27');
    assert.equal(graph[1]['@type'], 'Article');
    assert.equal(graph.find((node) => node['@type'] === 'BreadcrumbList').itemListElement.length, 2);
    const serialized = JSON.stringify(graph);
    assert(!/aggregateRating|HowTo|SearchAction|"review"|"offers"|"Organization"/.test(serialized), page.id);
  }
});
group('04 @id form and FAQ visible/JSON-LD parity', () => {
  for (const page of NEW) {
    const graph = graphOf(html[page.id]);
    for (const entry of graphIds(graph)) {
      const value = entry.slice(entry.indexOf('"', 5) + 1, -1);
      assert(/\/#(org|site|webpage|itemlist|breadcrumb|article|faq)$/.test(value), `${page.id} ${value}`);
    }
    const faq = graph.find((node) => node['@type'] === 'FAQPage');
    const visible = [...html[page.id].matchAll(/<details id="([^"]+)">\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)];
    if (page.id === 'examples') assert.equal(faq, undefined);
    else {
      assert.equal(visible.length, 3, page.id);
      assert.equal(faq.mainEntity.length, 3, page.id);
      visible.forEach((match, index) => {
        assert.equal(stripTags(match[2]), faq.mainEntity[index].name);
        assert.equal(stripTags(match[3]), faq.mainEntity[index].acceptedAnswer.text);
      });
    }
  }
});
group('05 executable scripts, images and outbound links', () => {
  for (const page of NEW) {
    assert.equal(executableScripts(html[page.id]), 0, page.id);
    assert.equal((html[page.id].match(/<img\b/g) ?? []).length, 0, page.id);
    const outbound = [...html[page.id].matchAll(/href="(https?:\/\/[^"]+)"/g)]
      .filter((match) => !match[1].startsWith('https://ai-metadata-remover.online/'));
    assert.equal(outbound.length, 0, page.id);
  }
});
group('06 forbidden words, routes and three red lines', () => {
  const forbidden = [/undetectable/i, /bypass/i, /beat detection/i, /100% safe/i, /guaranteed/i, /100% clean/i, /completely removed/i, /\bdelve\b/i, /\bleverage\b/i, /\bseamless\b/i, /\brobust\b/i, /in today's fast-paced world/i, /warmly welcome/i, /\bbest\b/i, /\bfastest\b/i, /#1/, /\bleading\b/i, /\brevolutionary\b/i, /unlike them/i, /fails to/i, /does not work/i, /\bworse\b/i, /30 minutes/i];
  for (const page of NEW) {
    const text = visibleText(html[page.id]);
    for (const pattern of forbidden) assert(!pattern.test(text), `${page.id} ${pattern}`);
    assert(!text.includes('!'), page.id);
    assert(!/\/(pdf|video|ai-metadata-remover|guides|label|remove-ai-label)\//.test(html[page.id]), page.id);
    assert(!/\b\d+(?:\.\d+)?%\s*(?:removed|clean|success)/i.test(text), page.id);
  }
});
group('07 body word budgets', () => {
  assert(bodyWords(html.examples) >= 500 && bodyWords(html.examples) <= 900, `examples=${bodyWords(html.examples)}`);
  for (const page of NEW.filter((item) => item.id !== 'examples')) {
    assert(bodyWords(html[page.id]) >= 800 && bodyWords(html[page.id]) <= 1200, `${page.id}=${bodyWords(html[page.id])}`);
  }
});
group('08 examples cards and empty-state order', () => {
  assert.equal((html.examples.match(/data-sample-id="/g) ?? []).length, 8);
  const empty = [...html.examples.matchAll(/<article[^>]*class="[^"]*empty-state[\s\S]*?<\/article>/g)];
  assert.equal(empty.length, 2);
  for (const match of empty) {
    assert.equal(count(match[0], 'Nothing found does not mean the file is not AI'), 1);
    assert(match[0].indexOf('Nothing found does not mean the file is not AI') < match[0].indexOf('before-after'));
  }
  assert.equal(count(html.examples, 'Nothing found does not mean the file is not AI'), 2);
});
group('09 examples folding and table forms', () => {
  assert.equal(count(html.examples, '<summary>Show the full field list</summary>'), 2);
  assert.equal((html.examples.match(/<table class="sample-table before-after">/g) ?? []).length, 8);
  assert(count(html.examples, 'No metadata fields found') >= 2);
  assert(count(html.examples, 'Unchanged') >= 1);
});
group('10 cleaner facts and引用 limits', () => {
  for (const value of ['$0', '$10', '$99', '$49', 'three images a day', 'ten a day']) assert(html.cleaner.includes(value), value);
  assert.equal(count(html.cleaner, 'We could not verify this as of 2026-10-26.'), 1);
  assert.equal(count(mainContent(html.cleaner), 'deleted within minutes'), 2);
  assert(!/not support|does not support|no c2pa/i.test(html.cleaner));
});
group('11 DeleteFootprints facts and note cell', () => {
  assert.equal(count(html.deletefootprints, 'not the limit per file'), 1);
  assert.equal(count(html.deletefootprints, 'No paid plan was live at its /pricing on 2026-10-26'), 1);
  assert.equal(count(html.deletefootprints, 'We could not verify this as of 2026-10-26.'), 2);
  assert.equal(classCount(html.deletefootprints, 'cell-note'), 1);
  assert(/5 files per run/.test(html.deletefootprints) && /100MB/.test(html.deletefootprints));
  assert(!/deleted after|retained for/i.test(html.deletefootprints));
});
group('12 EXIF claims, C2PA wording and two differences', () => {
  assert.equal(count(html.exifremover, 'We could not verify this as of 2026-10-26.'), 3);
  assert.equal(count(html.exifremover, 'Two things, not three.'), 1);
  assert.equal(count(html.exifremover, 'are not mentioned anywhere on its home page'), 1);
  assert.equal(classCount(html.exifremover, 'cell-claim'), 2);
  assert.equal(classCount(html.exifremover, 'cell-note'), 0);
  assert(!/processes video locally|handles pdf locally|is fully local|does not support C2PA/i.test(html.exifremover));
});
group('13 new-page matrix links and unique home anchors', () => {
  const expected = {
    examples: ['remove metadata from a photo', 'See what the report contains', 'clean a file in your browser', 'Free and paid plans'],
    cleaner: ['see the before and after samples', 'Free and paid plans', 'try it on a file you already have', 'vs DeleteFootprints', 'vs EXIF Remover'],
    deletefootprints: ['see the before and after samples', 'Free and paid plans', 'open the tool', 'vs AI Metadata Cleaner', 'vs EXIF Remover'],
    exifremover: ['see the before and after samples', 'Free and paid plans', 'run it on your own photo', 'vs AI Metadata Cleaner', 'vs DeleteFootprints'],
  };
  for (const page of NEW) {
    const links = linksOf(html[page.id]);
    assert(links.filter((link) => link.href.startsWith('/')).length >= 3, page.id);
    for (const anchor of expected[page.id]) assert(links.some((link) => link.anchor === anchor), `${page.id} ${anchor}`);
  }
  const homeAnchors = NEW.map((page) => linksOf(html[page.id]).find((link) => link.href === '/' && link.anchor !== 'Home')?.anchor);
  assert.equal(new Set(homeAnchors).size, 4);
});
group('14 seven-page main links and no orphan', () => {
  for (const source of allPages) {
    const links = linksOf(readPage(source.file)).filter((link) => link.href.startsWith('/'));
    assert(links.length >= 3, `${source.id}=${links.length}`);
  }
  for (const target of allPages) {
    const linked = allPages.some((source) => source.id !== target.id && linksOf(readPage(source.file))
      .some((link) => link.href === target.path || (target.path === '/' && link.href.startsWith('/#'))));
    assert(linked, `orphan ${target.path}`);
  }
});
group('15 Footer and Header coverage', () => {
  for (const page of allPages) {
    const text = readPage(page.file);
    const footer = text.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
    const header = text.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
    assert(footer.includes('href="/examples/"'), page.id);
    assert(!header.includes('/examples/'), page.id);
  }
});
group('16 anchor uniqueness and fragments', () => {
  const fixed = allPages.flatMap((page) => linksOf(readPage(page.file)))
    .filter((link) => link.anchor === 'Metadata Remover' && link.href === '/');
  assert.equal(fixed.length, 2);
  const byAnchor = new Map();
  for (const page of NEW) {
    for (const link of linksOf(html[page.id])) {
      if (link.href.includes('#')) assert.equal(link.href, '/#what-the-report-shows-you');
      const targets = byAnchor.get(link.anchor) ?? new Set();
      targets.add(link.href);
      byAnchor.set(link.anchor, targets);
    }
  }
  for (const [anchor, targets] of byAnchor) assert.equal(targets.size, 1, anchor);
});
group('17 unverified wording totals', () => {
  assert.equal(count(html.cleaner, 'We could not verify this as of 2026-10-26.'), 1);
  assert.equal(count(html.deletefootprints, 'We could not verify this as of 2026-10-26.'), 2);
  assert.equal(count(html.exifremover, 'We could not verify this as of 2026-10-26.'), 3);
});
group('18 runtime and build dependency whitelist', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const runtime = JSON.stringify(pkg.dependencies ?? {});
  assert(!/libheif-js|piexifjs|png-chunks-extract|c2pa|contentauth|ffmpeg|exiftool|mupdf|ghostscript|pdf-lib|mediabunny|mp4box/.test(runtime));
  const allowed = new Set(['typescript', 'piexifjs', 'png-chunks-extract', 'libheif-js']);
  for (const name of Object.keys(pkg.devDependencies ?? {})) assert(allowed.has(name), name);
  assert.equal(pkg.dependencies.exifr, '^7.1.3');
});
group('19 generated sample source and assets', () => {
  const source = readFileSync(join(ROOT, 'src', 'data', 'examples.ts'), 'utf8');
  assert.equal((source.match(/"id":/g) ?? []).length, 8);
  for (const id of ['pixel-exif-basic', 'iphone-heic-makernote', 'sd-png-text-chunk', 'c2pa-signed-manifest', 'adobe-xmp-iptc-full', 'webp-exif-chunk', 'no-tags-at-all', 'already-cleaned']) {
    assert(source.includes(`"id": "${id}"`), id);
    const file = source.match(new RegExp(`"id": "${id}"[\\s\\S]*?"file": "([^"]+)"`))?.[1];
    assert(file && existsSync(join(ROOT, 'src', 'assets', 'examples', file)), id);
  }
  assert(existsSync(join(ROOT, 'scripts', 'examples', 'verify-samples.mjs')));
});
group('20 CSS budgets and static source href boundary', () => {
  assert(gzipSync(readFileSync(join(ROOT, 'src', 'styles', 'examples.css'))).length <= 3 * 1024);
  assert(gzipSync(readFileSync(join(ROOT, 'src', 'styles', 'compare.css'))).length <= 2.5 * 1024);
  for (const page of NEW) {
    const source = page.file.replace(`${DIST}${page.path.replaceAll('/', '\\')}`, '');
    const relative = page.id === 'examples' ? 'src/pages/examples/index.astro' : `src/pages/compare/vs-${page.id === 'cleaner' ? 'aimetadatacleaner' : page.id}/index.astro`;
    assert(!/href="\//.test(readFileSync(join(ROOT, relative), 'utf8')), relative);
  }
});
group('21 dist and sitemap seven-page closure', () => {
  const indexes = walk(DIST).filter((file) => file.endsWith('index.html'));
  assert.equal(indexes.length, 7);
  const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  assert.equal((sitemap.match(/<url>/g) ?? []).length, 7);
  for (const page of NEW) assert(sitemap.includes(`<loc>https://ai-metadata-remover.online${page.path}</loc>`));
});
if (failures) {
  console.error(`check-3b: ${failures} assertion group(s) failed`);
  process.exit(1);
}
console.log('3B OK · 4 pages · 7 internal links matrix · 21 assertions');
