// Verbatim from p3_r04_batch_02.md §5 (Free/Pro table + early-bird copy),
// with limits per F22 (5 files/100MB free, 100 files/2GB Pro).
export const PLAN_TABLE = {
  columns: ['', 'Free', 'Pro'],
  rows: [
    ['Price', '$0', '$10 a month, or $99 a year'],
    ['Annual saving', '—', '$99 a year is 17.5% less than $120'],
    ['Photo cleaning', 'Unlimited, in your browser', 'Unlimited, in your browser'],
    ['Before and after comparison', 'Yes', 'Yes'],
    ['Downloadable cleaning report', 'Yes', 'Yes'],
    ['Ads', 'Shown on the tool pages', 'Hidden'],
    [
      'Video and PDF cleaning',
      '5 files a month, up to 100MB each — coming soon',
      '100 files a month, up to 2GB each — coming soon',
    ],
    ['Card required today', 'No', 'No'],
  ],
} as const;

export const PRICING_ANCHOR =
  'Photos work today. Video and PDF do not, and we will not pretend they do.';

export const PRO_CARD_COPY = {
  trigger: 'Photos: unlimited, free, forever. Video and PDF: in the works.',
  value:
    'Pro gives you 100 video and PDF files a month when they launch, and no ads today.',
  primaryCta: 'Lock my price',
  secondaryCta: 'Email me when video and PDF are ready',
  lockPriceNote: 'Card saving opens with the first paid release',
  facts: [
    'No charge today.',
    'We save your card and charge the first payment when video and PDF cleaning goes live.',
    'Your price stays the same for as long as your subscription is active.',
  ],
  footnote: 'You can cancel before the first charge and nothing is billed.',
  successMessage: 'Thanks. We will write once, when video and PDF are ready.',
} as const;
