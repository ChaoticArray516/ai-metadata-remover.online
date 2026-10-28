import { PAGES, readPage, mainContent, check, finish } from './lib.mjs';

const PLANNED = /href="\/(guides|remove-metadata-from-pdf|remove-metadata-from-video|ai-metadata-remover|remove-ai-label)/;

for (const page of PAGES) {
  const html = readPage(page.file);
  const main = mainContent(html);
  const links = [...main.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: match[1],
    anchor: match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  }));
  const internal = links.filter((link) => link.href.startsWith('/'));
  check(`${page.id} internal links >= 3 (main)`, internal.length >= 3, `found=${internal.length}`);
  check(`${page.id} no planned route rendered`, !PLANNED.test(html));
  check(`${page.id} no planned route string in output`,
    !/\/(guides|remove-metadata-from-pdf|remove-metadata-from-video|ai-metadata-remover|remove-ai-label)\//.test(html));
  if (page.id === 'photo') {
    check('photo has fixed Metadata Remover anchor', internal.some((link) => link.anchor === 'Metadata Remover' && link.href === '/'));
    const body = main.replace(/<script[\s\S]*?<\/script>/g, '');
    check('photo main has no bare Remover outside brand', !/Remover/.test(body.replace(/Metadata Remover/g, '')));
  }
  if (page.id === 'home') {
    const anchors = new Set(internal.map((link) => link.anchor));
    check('home anchors distinct', anchors.size === internal.length, [...anchors].join(' | '));
  }
}

finish('check-links');
