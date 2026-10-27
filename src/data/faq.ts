export interface FaqItem {
  readonly id: string;
  readonly q: string;
  readonly a: string;
}

// Verbatim from phase3/3a_faq_copy.md (round05 receipt). Do not rewrite.
export const FAQ_HOME: readonly FaqItem[] = [
  {
    id: 'can-you-remove-ai-labels',
    q: 'Can you remove AI labels from a file?',
    a: 'It removes the tags inside the file, not the label a person sees on a screen. An AI label can sit in two places. Inside the file it is a Content Credentials manifest, an XMP field, or an IPTC field. Outside the file it is a caption, badge, or sticker added by the platform where the image was posted. We clean the first. We cannot reach the second. If a site applied the label during upload, it stays until you delete the post.',
  },
  {
    id: 'synthid-watermarks',
    q: 'Does this remove SynthID or other watermarks?',
    a: 'No. SynthID is a watermark written into the pixels themselves, not into the metadata, and this tool only reads and removes metadata. Stripping the tags does not strip the watermark. Other pixel-level watermarks behave the same way. If you need those gone, we are the wrong tool, and any product that claims to do it by cleaning metadata is describing something else.',
  },
  {
    id: 'still-detectable',
    q: 'After cleaning, can a file still be detected as AI?',
    a: 'We do not claim that, and we do not use that word. Cleaning removes the metadata that carried the signal. Nothing found does not mean the file is not AI. A file can come from Midjourney with no C2PA manifest and no IPTC field at all; that is how that tool writes files, not a failure of our parser. Detection also runs on pixels, compression patterns, and watermarks, and we cannot change any of those.',
  },
  {
    id: 'metadata-returns',
    q: 'Can metadata come back after I clean a file?',
    a: 'Yes. Metadata is not permanent. Any editor, camera app, or platform can write fresh tags into a file, and a re-upload or a screenshot can add or drop fields without asking you. Our report records what was in the file at the second you cleaned it, field by field, before and after. It is evidence about that moment, not a promise about tomorrow.',
  },
  {
    id: 'how-to-verify',
    q: 'What exactly gets removed, and how do I check it myself?',
    a: 'The report shows the field list we read before cleaning and the field list we read after, side by side. The after column is a fresh parse of the cleaned file by the same parser, not a copy of the first read. Anything we could not remove stays visible with a note next to it instead of disappearing from the list. You can download the report and check it yourself.',
  },
  {
    id: 'file-retention',
    q: 'Do you keep my file after I clean it?',
    a: 'Your file never leaves your browser. Cleaning runs on your own machine, so there is no copy on our servers to delete, no queue, and no temporary storage. We do not keep files for training, and you do not need an account to use the tool. One caveat: if you clean a file you have no right to modify, that is your responsibility, and a clean report does not make an image safe to use.',
  },
];

export const FAQ_PHOTO: readonly FaqItem[] = [
  {
    id: 'can-you-remove-ai-labels',
    q: 'Can you remove AI labels from a photo?',
    a: 'A photo can carry an AI label in two different places. Inside the file it may be a Content Credentials manifest, an XMP field, or an IPTC field. Outside the file it is the caption or badge the app added when you posted it. We clean the part inside the file. We cannot reach the part on the platform. A badge applied at upload stays on the post until you take the post down.',
  },
  {
    id: 'synthid-watermarks',
    q: 'Will this take off SynthID or a watermark on a photo?',
    a: 'No. SynthID lives in the pixels, not in the metadata segments, and this tool only touches metadata. Deleting the EXIF and XMP blocks will not delete the watermark. Other pixel-level marks work the same way. If a watermark is what you need gone, this is not the tool for it, and no amount of metadata cleaning will get you there.',
  },
  {
    id: 'still-detectable',
    q: 'Will a cleaned photo still be flagged as AI?',
    a: 'We do not use that word, and we do not make that claim. What we remove is the metadata that carried the AI signal. Nothing found does not mean the file is not AI. A photo can arrive from a phone with GPS, device model, and lens data, and still have no AI marker at all, or arrive with a marker no inspector reads. Detection also weighs pixels and compression, which cleaning cannot change.',
  },
  {
    id: 'metadata-returns',
    q: 'Can EXIF and GPS data come back after I clean a photo?',
    a: 'Yes. A phone writes a new set of EXIF tags every time the shutter fires, and an editor, a messaging app, or a listing platform can add fields back on its own. If you clean a photo, sell the item, and then re-download it from the marketplace, check it again before you post it somewhere else. The report describes the file as it was when you cleaned it, not what it will contain later.',
  },
  {
    id: 'how-to-verify',
    q: 'How do I confirm the GPS and device details are gone?',
    a: 'Open the report and compare the two lists. The left side is what we read from your iPhone or Android file before cleaning: device make and model, timestamps, GPS coordinates when they were present, and the rest. The right side is a second parse of the cleaned file, not a copy of the first. Fields we could not clear are still listed with a note. Download it and keep it with the photo.',
  },
  {
    id: 'file-retention',
    q: 'Does my photo get uploaded anywhere?',
    a: 'Your photo stays on your phone or laptop. Everything runs inside the browser tab, so there is no upload, no server copy, and nothing for us to retain. No account is needed. This matters most with GPS: a listing photo that carries coordinates points at a real address, and the file never has to travel to us to lose them. If you clean a photo you have no right to change, that is on you.',
  },
];

// Verbatim from phase0/p0_extend_part_d.md §2.5.
export const FAQ_PRICING: readonly FaqItem[] = [
  {
    id: 'video-pdf-availability',
    q: 'Is video or PDF cleaning available right now?',
    a: 'No. Photo cleaning works today. Video and PDF cleaning is still being built, and the monthly limits above describe what the plans will include when it is ready.',
  },
  {
    id: 'charged-before-ready',
    q: 'Am I charged before it is ready?',
    a: 'No. We store your card and charge $0. Your first payment is on the day video and PDF cleaning goes live, and we email you before that day.',
  },
  {
    id: 'price-after-cancel',
    q: 'What happens to my price if I cancel?',
    a: 'The locked price stays with an active subscription. If you cancel and come back after the price has changed, you get the price in effect at that time.',
  },
];

// Verbatim from phase0/p0_extend_part_b.md §2.2.
export const DISCLAIMER = {
  heading: 'About this page',
  paragraphs: [
    'This page explains what AI-related metadata is and what our checker found inside the file you uploaded. It is general information, not legal advice. We are not lawyers, and we do not tell you whether a particular use of an image is lawful where you live. Rules on AI labelling and disclosure differ by country and change often. If you need to know what the law requires of you, ask a qualified lawyer.',
    'We show you what is written inside your file, read with the same libraries we use for cleaning. We show what was removed in the before-and-after report. When we cannot see something, we say so on the page instead of staying quiet. Two examples: invisible watermarks such as SynthID are not metadata and are not touched by this tool; a file with no tags may still be AI-generated.',
    'This page does not give legal advice, and nothing here is a promise about how any platform, regulator, or court will treat your file.',
  ],
} as const;

export function assertFaqDistinct(home: readonly FaqItem[], photo: readonly FaqItem[]): void {
  if (home.length === 0 || photo.length === 0) return;
  if (home.length !== photo.length) {
    throw new Error('FAQ_HOME and FAQ_PHOTO must have the same number of intent slots.');
  }
  home.forEach((item, i) => {
    const other = photo[i];
    if (!other) return;
    if (item.id !== other.id) {
      throw new Error(`FAQ intent slot mismatch at index ${i}: ${item.id} vs ${other.id}`);
    }
    if (item.a.trim().toLowerCase() === other.a.trim().toLowerCase()) {
      throw new Error(`FAQ answers must differ between home and photo at slot ${item.id}.`);
    }
  });
}

assertFaqDistinct(FAQ_HOME, FAQ_PHOTO);
