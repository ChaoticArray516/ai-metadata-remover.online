import { SITE } from '../data/site';
import type { FaqItem } from '../data/faq';

export const FEATURE_LIST = [
  'Removes EXIF, XMP, IPTC and JUMBF metadata segments from JPEG files in your browser',
  'Reads Content Credentials and reports what is inside your file',
  'Shows a before and after field-by-field comparison',
  'Generates a downloadable cleaning report for your own records',
] as const;

export function orgNode() {
  return {
    '@type': 'Organization',
    '@id': SITE.orgId,
    name: SITE.brand,
    url: `${SITE.origin}/`,
    logo: {
      '@type': 'ImageObject',
      '@id': SITE.logoId,
      url: SITE.logoUrl,
      contentUrl: SITE.logoUrl,
      width: 512,
      height: 512,
      caption: SITE.brand,
    },
    image: { '@id': SITE.logoId },
  };
}

export function siteNode() {
  return {
    '@type': 'WebSite',
    '@id': SITE.siteId,
    url: `${SITE.origin}/`,
    name: SITE.brand,
    publisher: { '@id': SITE.orgId },
    inLanguage: 'en-US',
  };
}

export function webAppNode(pageUrl: string, name: string, description: string) {
  return {
    '@type': 'WebApplication',
    '@id': `${pageUrl}#webapp`,
    name,
    url: pageUrl,
    description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (Web Browser)',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': SITE.orgId },
    featureList: [...FEATURE_LIST],
  };
}

export function webPageNode(pageUrl: string, name: string) {
  return {
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name,
    isPartOf: { '@id': SITE.siteId },
    about: { '@id': `${pageUrl}#webapp` },
    publisher: { '@id': SITE.orgId },
    inLanguage: 'en-US',
  };
}

export interface Crumb {
  readonly name: string;
  readonly item: string;
}

export function breadcrumbNode(pageUrl: string, crumbs: readonly Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

export function faqNode(pageUrl: string, faqs: readonly FaqItem[]) {
  return {
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function jsonLdScript(graph: readonly object[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}
