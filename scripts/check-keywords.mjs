import { PAGES, readPage, titleOf, h1Of, visibleText, wordCount, check, finish, mainContent, stripTags } from './lib.mjs';

const html = Object.fromEntries(PAGES.map((page) => [page.id, readPage(page.file)]));

/**
 * D1（2026-10-26 用户裁决·方案 A）：词数口径 = 正文词数。
 * 排除非正文组件：工具台（含 ProCard/WaitlistForm/AdSlot）、FAQ（details）、免责声明、面包屑。
 * 输出 bodyWords 与各项 excluded 明细，防止"藏词"——排除块必须真实命中，未命中即 FAIL。
 */
export function bodyWordReport(pageHtml, id) {
  let body = mainContent(pageHtml);
  const removed = {};
  const cut = (name, pattern, required = true) => {
    const before = wordCount(stripTags(body));
    const next = body.replace(pattern, ' ');
    if (next === body && required) {
      console.error(`  FAIL ${id} exclusion block not found: ${name} — word-count caliber cannot be verified`);
      process.exitCode = 1;
    }
    const after = wordCount(stripTags(next));
    removed[name] = before - after;
    body = next;
  };

  // 工具台区块：tool-first 包裹 ToolBench + ProCard + AdSlot，止于首个正文 <section><h2>
  cut('tool+pro+ads', /<section class="tool-first"[\s\S]*?(?=<section>\s*<h2)/);
  // FAQ 问答（保留 "Common questions" H2 标题本身）
  cut('faq', /<details[\s\S]*?<\/details>/g);
  // 免责声明
  cut('disclaimer', /<aside class="disclaimer"[\s\S]*?<\/aside>/g);
  // 面包屑（首页按 F28 不挂，允许缺失）
  cut('breadcrumbs', /<nav class="breadcrumbs"[\s\S]*?<\/nav>/g, false);

  return { bodyWords: wordCount(stripTags(body)), excluded: removed };
}

const homeTitle = titleOf(html.home);
check('home title contains Metadata Remover', homeTitle.includes('Metadata Remover'), homeTitle);
check('home title has no AI', !/\bAI\b/i.test(homeTitle), homeTitle);
check('home title verbatim', homeTitle === 'Metadata Remover — Inspect and Remove EXIF, XMP, IPTC', homeTitle);
check('home H1 verbatim', h1Of(html.home) === 'Metadata Remover');
check('home H2 count = 7', (html.home.match(/<h2/g) ?? []).length === 7);

const photoTitle = titleOf(html.photo);
check('photo title contains continuous substring', photoTitle.includes('Remove Metadata from Photo'), photoTitle);
check('photo title verbatim', photoTitle === 'Remove Metadata from Photo — EXIF, GPS and XMP Cleaner', photoTitle);
check('photo H1 verbatim', h1Of(html.photo) === 'Remove Metadata from Photo');
check('photo H2 count = 8', (html.photo.match(/<h2/g) ?? []).length === 8);
check('photo formats are H3', ['PNG', 'HEIC', 'WebP'].every((name) => new RegExp(`<h3>${name}</h3>`).test(html.photo)));
check('photo Title/H1 no AI', !/\bAI\b/i.test(photoTitle) && !/\bAI\b/i.test(h1Of(html.photo)));
check('photo Title/H1 no bare Remover', !/Remover/.test(photoTitle) && !/Remover/.test(h1Of(html.photo)));

const pricingTitle = titleOf(html.pricing);
check('pricing title starts with Pricing', pricingTitle.startsWith('Pricing'), pricingTitle);
check('pricing title verbatim', pricingTitle === 'Pricing — Free Photo Cleaning and Paid Plans', pricingTitle);
check('pricing coming soon >= 2', (html.pricing.match(/coming soon/g) ?? []).length >= 2);
check('pricing anchor sentence exactly once',
  html.pricing.split('Photos work today. Video and PDF do not, and we will not pretend they do.').length - 1 === 1);
check('annual saving arithmetic', Math.abs((120 - 99) / 120 - 0.175) < 1e-9
  && html.pricing.includes('$99 a year is 17.5% less than $120'));
check('no video/pdf availability claim',
  visibleText(html.pricing).split(/(?<=[.!?])\s+/).every((sentence) =>
    !/(video|pdf)[^.]{0,40}(available|ready|works today)/i.test(sentence)
    || /coming soon|not |being built|Email me|goes live|We will write once/i.test(sentence)
    || sentence.trimEnd().endsWith('?')));

const homeText = visibleText(html.home);
const homeWords = wordCount(homeText);
const homeBody = bodyWordReport(html.home, 'home');
const homeDetail = `pageWords=${homeWords} (home 仍按全页口径) — bodyWords=${homeBody.bodyWords} excluded=${JSON.stringify(homeBody.excluded)}`;
check('home word count 800..1600 (page-level)', homeWords >= 800 && homeWords <= 1600, homeDetail);
console.log(`  INFO home words: ${homeDetail}`);
const photoText = visibleText(html.photo);
const photoWords = wordCount(photoText);
const photoBody = bodyWordReport(html.photo, 'photo');
const photoDetail = `bodyWords=${photoBody.bodyWords} excluded=${JSON.stringify(photoBody.excluded)} pageWords=${photoWords}`;
check('photo body word count 800..1200 (D1)', photoBody.bodyWords >= 800 && photoBody.bodyWords <= 1200, photoDetail);
console.log(`  INFO photo words: ${photoDetail}`);

const phraseCount = (homeText.match(/metadata remover/gi) ?? []).length;
check('home main phrase 4..8 (M1)', phraseCount >= 4 && phraseCount <= 8, `count=${phraseCount}`);

function familyCoverage(text) {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => /metadata/i.test(sentence) && /remov/i.test(sentence)).length;
}
check('home word-family coverage >= 8 sentences (M1)', familyCoverage(homeText) >= 8, `sentences=${familyCoverage(homeText)}`);
check('photo word-family coverage >= 8 sentences (M1)', familyCoverage(photoText) >= 8, `sentences=${familyCoverage(photoText)}`);

for (const id of ['home', 'photo']) {
  check(`${id} detection hook verbatim`, visibleText(html[id]).includes('Nothing found does not mean the file is not AI'));
  check(`${id} Midjourney named`, /Midjourney[^.]*does not write/i.test(visibleText(html[id])));
  const lede = visibleText(html[id]).split(' ').length;
  check(`${id} has content`, lede > 100);
}

finish('check-keywords');
