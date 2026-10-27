export const LINKS = {
  home: { href: '/', anchor: 'Metadata Remover', live: true },
  photo: { href: '/remove-metadata-from-photo/', anchor: 'Remove Metadata from Photo', live: true },
  pricing: { href: '/pricing/', anchor: 'Pricing', live: true },
} as const;

// Unlaunched routes: comment placeholders only, tagged with their batch.
// No function reads PLANNED, so these can never render as <a>.
export const PLANNED = [
  // [3b] /examples/            — before/after sample gallery
  // [3b] /compare/             — competitor comparisons
  // [3b] /guides/              — how metadata works
  // [3c] /remove-metadata-from-pdf/
  // [3d] /remove-metadata-from-video/
  // [3e] /ai-metadata-remover/
  // [3e] /remove-ai-label/
] as const;
