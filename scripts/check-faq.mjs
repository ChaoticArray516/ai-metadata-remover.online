import { PAGES, readPage, graphOf, stripTags, check, finish } from './lib.mjs';

const visible = {};
const schema = {};

for (const page of PAGES) {
  const html = readPage(page.file);
  const faqNode = graphOf(html).find((node) => node['@type'] === 'FAQPage');
  const items = [];
  const regex = /<details id="([^"]+)">\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = regex.exec(html))) {
    items.push({ id: match[1], q: stripTags(match[2]), a: stripTags(match[3]) });
  }
  visible[page.id] = items;
  schema[page.id] = faqNode?.mainEntity ?? [];

  if (items.length === 0 && page.id !== 'pricing') {
    check(`${page.id} FAQ present`, false, 'F33 blocked: verbatim FAQ copy (phase3/3a_faq_copy.md) has not been delivered');
    continue;
  }
  check(`${page.id} FAQ counts match`, items.length === schema[page.id].length && items.length > 0,
    `visible=${items.length} schema=${schema[page.id].length}`);
  items.forEach((item, index) => {
    const node = schema[page.id][index];
    check(`${page.id} FAQ ${item.id} question verbatim`, node?.name === item.q);
    check(`${page.id} FAQ ${item.id} answer verbatim`, node?.acceptedAnswer?.text === item.a);
  });
  if (page.id !== 'pricing') {
    check(`${page.id} FAQ count = 6`, items.length === 6);
    check(`${page.id} Q3 hook`, items[2]?.a.includes('Nothing found does not mean the file is not AI'));
  } else {
    check('pricing FAQ count = 3', items.length === 3);
  }
}

if (visible.home.length === 6 && visible.photo.length === 6) {
  visible.home.forEach((item, index) => {
    check(`FAQ home/photo differ at ${item.id}`,
      item.a.trim().toLowerCase() !== visible.photo[index]?.a.trim().toLowerCase());
    check(`FAQ intent slots match at ${item.id}`, item.id === visible.photo[index]?.id);
  });
}

finish('check-faq');
