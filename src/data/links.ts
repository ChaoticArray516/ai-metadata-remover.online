export const LINKS = {
  home: { href: '/', anchor: 'Metadata Remover', live: true },
  photo: { href: '/remove-metadata-from-photo/', anchor: 'Remove Metadata from Photo', live: true },
  pricing: { href: '/pricing/', anchor: 'Pricing', live: true },
  examples: { href: '/examples/', anchor: 'Examples', live: true },
  cleaner: { href: '/compare/vs-aimetadatacleaner/', anchor: 'vs AI Metadata Cleaner', live: true },
  deletefootprints: { href: '/compare/vs-deletefootprints/', anchor: 'vs DeleteFootprints', live: true },
  exifremover: { href: '/compare/vs-exifremover/', anchor: 'vs EXIF Remover', live: true },
} as const;

export type PageKey = 'home' | 'photo' | 'pricing' | 'examples' | 'cleaner' | 'deletefootprints' | 'exifremover';

export interface ContextLink {
  readonly anchor: string;
  readonly href: string;
  readonly where: string;
}

const compareLinks = (
  page: 'cleaner' | 'deletefootprints' | 'exifremover',
  homeAnchor: string,
): readonly ContextLink[] => [
  { anchor: 'see the before and after samples', href: LINKS.examples.href, where: 'after-differences' },
  { anchor: 'Free and paid plans', href: LINKS.pricing.href, where: 'after-table' },
  { anchor: homeAnchor, href: LINKS.home.href, where: 'after-fit' },
  ...(['cleaner', 'deletefootprints', 'exifremover'] as const)
    .filter((key) => key !== page)
    .map((key) => ({ anchor: LINKS[key].anchor, href: LINKS[key].href, where: 'other-comparisons' })),
];

export const CONTEXT_LINKS: Record<PageKey, readonly ContextLink[]> = {
  home: [],
  photo: [],
  pricing: [],
  examples: [
    { anchor: 'remove metadata from a photo', href: LINKS.photo.href, where: 'after-phone' },
    { anchor: 'See what the report contains', href: '/#what-the-report-shows-you', where: 'after-report' },
    { anchor: 'clean a file in your browser', href: LINKS.home.href, where: 'after-empty' },
    { anchor: 'Free and paid plans', href: LINKS.pricing.href, where: 'page-end' },
  ],
  cleaner: compareLinks('cleaner', 'try it on a file you already have'),
  deletefootprints: compareLinks('deletefootprints', 'open the tool'),
  exifremover: compareLinks('exifremover', 'run it on your own photo'),
};

export const PLANNED = [
  // [3b] /guides/              — how metadata works
  // [3c] /remove-metadata-from-pdf/
  // [3d] /remove-metadata-from-video/
  // [3e] /ai-metadata-remover/
  // [3e] /remove-ai-label/
] as const;
