import { PAGES, readPage, graphOf, check, finish } from './lib.mjs';

const FEATURE_LIST = [
  'Removes EXIF, XMP, IPTC and JUMBF metadata segments from JPEG files in your browser',
  'Reads Content Credentials and reports what is inside your file',
  'Shows a before and after field-by-field comparison',
  'Generates a downloadable cleaning report for your own records',
];

const allIds = new Set();

for (const page of PAGES) {
  const html = readPage(page.file);
  const graph = graphOf(html);
  const serialized = JSON.stringify(graph);
  check(`${page.id} no aggregateRating/HowTo/SearchAction`, !/aggregateRating|HowTo|SearchAction/.test(serialized));

  const ids = JSON.stringify(graph).match(/"@id"\s*:\s*"[^"]*"/g) ?? [];
  for (const entry of ids) {
    const value = entry.slice(entry.indexOf('"', 5) + 1, -1);
    check(`${page.id} @id trailing form ${value}`, /\/$|\/#[a-z-]+$/.test(value), value);
  }

  for (const node of graph) {
    const value = node['@id'];
    if (typeof value !== 'string') continue;
    check(`${page.id} node @id unique ${value}`, !allIds.has(value), value);
    allIds.add(value);
  }

  const orgCount = graph.filter((node) => node['@type'] === 'Organization').length;
  const siteCount = graph.filter((node) => node['@type'] === 'WebSite').length;
  if (page.id === 'home') {
    check('home defines org and site once', orgCount === 1 && siteCount === 1);
    check('home has no BreadcrumbList', !graph.some((node) => node['@type'] === 'BreadcrumbList'));
  } else {
    check(`${page.id} does not redefine org/site`, orgCount === 0 && siteCount === 0);
    const breadcrumb = graph.find((node) => node['@type'] === 'BreadcrumbList');
    check(`${page.id} two-level breadcrumb`, breadcrumb?.itemListElement?.length === 2);
    check(`${page.id} breadcrumb positions`, breadcrumb?.itemListElement?.every((item, index) => item.position === index + 1));
  }

  const app = graph.find((node) => node['@type'] === 'WebApplication');
  if (page.id !== 'pricing') {
    check(`${page.id} featureList whitelist`, JSON.stringify(app?.featureList) === JSON.stringify(FEATURE_LIST));
    check(`${page.id} featureList no C2PA removal claim`,
      !/(remove|delete|strip)[^"]*(c2pa|content credential)/i.test(JSON.stringify(app?.featureList ?? [])));
    check(`${page.id} single free offer`, app?.offers?.price === '0' && app?.offers?.priceCurrency === 'USD');
  } else {
    check('pricing offers is a single Free $0 Offer',
      app?.offers?.['@type'] === 'Offer' && app?.offers?.name === 'Free' && app?.offers?.price === '0'
      && !Array.isArray(app?.offers));
    check('pricing no Pro offer / priceSpecification / unitCode',
      !/priceSpecification|unitCode|"name"\s*:\s*"Pro"/.test(serialized));
  }

  check(`${page.id} canonical trailing slash`, html.includes(`<link rel="canonical" href="https://ai-metadata-remover.online${page.path}"`));
  check(`${page.id} no {{ residue`, !html.includes('{{'));
}

finish('check-schema');
