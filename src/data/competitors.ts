import type { FaqItem } from './faq';

export const UNVERIFIED = 'We could not verify this as of 2026-10-26.';

export type CompareKey = 'cleaner' | 'deletefootprints' | 'exifremover';

export interface CompareCell {
  readonly text: string;
  readonly checked?: boolean;
  readonly note?: boolean;
  readonly claim?: string;
  readonly strong?: boolean;
}

export interface CompareRow {
  readonly label: string;
  readonly self: string;
  readonly rival: CompareCell;
}

export interface VerdictContent {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface CompetitorPage {
  readonly key: CompareKey;
  readonly title: string;
  readonly description: string;
  readonly articleDescription: string;
  readonly h1: string;
  readonly breadcrumbName: string;
  readonly lead: string;
  readonly byline: string;
  readonly selfName: string;
  readonly rivalName: string;
  readonly featureParagraphs: readonly string[];
  readonly rows: readonly CompareRow[];
  readonly differences: VerdictContent;
  readonly limits: readonly string[];
  readonly fit: VerdictContent;
  readonly faqs: readonly FaqItem[];
  readonly claims?: readonly string[];
}

const COMMON_LIMIT = 'We do not remove watermarks written into pixels, such as SynthID. We do not change a label that a platform added to a post you already published. And when a cleaned file passes through another app, that app can write new tags into it. Nothing here makes a file safe to publish; it removes what the file was carrying when you handed it over.';

export const COMPETITORS: Record<CompareKey, CompetitorPage> = {
  cleaner: {
    key: 'cleaner',
    title: 'AI Metadata Remover vs AI Metadata Cleaner — Comparison',
    description: 'A feature and price comparison of AI Metadata Remover and AI Metadata Cleaner, checked on 2026-10-26. Processing location, limits, reports and plan prices.',
    articleDescription: 'A feature and price comparison of AI Metadata Remover and AI Metadata Cleaner, checked on 2026-10-26.',
    h1: 'AI Metadata Remover vs AI Metadata Cleaner',
    breadcrumbName: 'vs AI Metadata Cleaner',
    lead: 'Both tools remove metadata from images in the browser. They differ on where video and PDF are processed, on daily limits before you sign up, and on what you get to download afterwards. Everything below was read from the two sites on 2026-10-26.',
    byline: 'Checked 2026-10-26. Prices and limits are copied from each site; anything we could not open is marked as unchecked.',
    selfName: 'AI Metadata Remover',
    rivalName: 'AI Metadata Cleaner',
    featureParagraphs: [
      'Ten columns, one row per dimension, and a source date on every claim.',
      'For images, both tools work in the browser. The separation appears when a job moves beyond images: AI Metadata Cleaner lists video, PDF and RAW processing on its server according to its site. Our current build does not offer those three paths. Its image list also includes AVIF, while ours covers JPEG, PNG, WebP and HEIC.',
      'Batch limits depend on the plan and whether a visitor has signed up. AI Metadata Cleaner lists one file per run and three per day for anonymous visitors, then one per run and ten per day after signup. Pro allows ten per run, and Business allows fifty per run. Our tool has no account or daily cap but accepts one file per run. A daily allowance counts separate runs, while a per-run allowance describes one batch.',
      'Both services provide a way to review cleaning. Our comparison places fields before and after in two columns, and the report can be downloaded as HTML and JSON. Their service re-checks before download and calls its report “Verified-clean report”. Neither site lists a detection hook today. For C2PA, their free plan lists removal; our JPEG handling removes the JUMBF segment without presenting that as a promoted feature.',
      'The mobile cell for their service remains unchecked because we could not confirm a claim from the material read. The pricing cells are more definite: their free plan is $0, Pro is $10 a month or $99 a year, and Business is $49 a month with API and MCP access and 10,000 files a month. Their developer and MCP locations are recorded as plain text because this comparison does not send readers to an outside page.',
    ],
    rows: [
      { label: 'Processing location', self: 'Images are read and cleaned in your browser. Video and PDF are not available yet.', rival: { text: 'Images in the browser; video, PDF and RAW on their server, deleted within minutes (their site, 2026-10-26)' } },
      { label: 'Batch limit', self: 'No daily cap and no account. One file per run in the current build.', rival: { text: '1 file per run anonymous, 3 per day; after signup 1 per run, 10 per day; Pro 10 per run; Business 50 per run (their pricing page, 2026-10-26)' } },
      { label: 'Formats', self: 'JPEG, PNG, WebP, HEIC', rival: { text: 'Images JPEG, PNG, WebP, HEIC, AVIF; video MP4, MOV, M4V, 3GP, MKV, WebM; PDF; RAW CR2, CR3, NEF, ARW, RAF, RW2, DNG (their site, 2026-10-26)' } },
      { label: 'Before and after', self: 'Yes, field by field, left column before and right column after', rival: { text: 'Yes, re-checked before download (their site, 2026-10-26)' } },
      { label: 'Downloadable verification report', self: 'Yes, HTML and JSON', rival: { text: 'Yes, named “Verified-clean report” (their site, 2026-10-26)' } },
      { label: 'Detection hook', self: 'None today', rival: { text: 'None (their site, 2026-10-26)' } },
      { label: 'C2PA', self: 'The JUMBF segment in JPEG files is removed. We do not market this as a feature.', rival: { text: 'Listed as removed, in the first line of their free plan (their site, 2026-10-26)' } },
      { label: 'Mobile', self: 'Built mobile first', rival: { text: '', checked: false } },
      { label: 'Pricing', self: 'Free, no account needed', rival: { text: 'Free $0; Pro $10 a month or $99 a year; Business $49 a month with API and MCP, 10,000 files a month (their pricing page, 2026-10-26)' } },
      { label: 'API and MCP', self: 'None today', rival: { text: 'Both listed, at /developers and /mcp (their site, 2026-10-26)' } },
    ],
    differences: {
      heading: 'What we do differently',
      paragraphs: [
        'We built for a phone screen first, because that is where the file usually is. Every clean comes with a report you can download and keep, in HTML and JSON. And there is no account and no daily cap, against three images a day before you sign up on their free tier.',
        'The report is a separate file that remains available after the cleaning session, rather than only a check inside the page. The no-account workflow also removes the signup step between opening the tool and cleaning an image. It does not remove the current one-file-per-run boundary, which stays visible in the table.',
        'Their free tier distinguishes anonymous and registered use, so the applicable daily limit depends on that choice. Here, the same no-account limit applies on every visit: one image in a run, with no daily cap and both report formats included.',
      ],
    },
    limits: [
      COMMON_LIMIT,
      'The same boundary applies to video and PDF here: they are not available yet, so the report and no-account workflow described above apply to supported images. A report records fields before and after cleaning. It is not a statement about pixel watermarks, platform labels, or tags another app may add later.',
    ],
    fit: {
      heading: 'When another tool is the better fit',
      paragraphs: [
        'If you need video, PDF or RAW today, their tool covers those and ours does not. If you want an API or an MCP server, theirs is the one that lists both. If you are on a phone, working without an account, and you want a report on disk, this site is the shorter path.',
        'The choice starts with format and workflow rather than a general ranking. A mixed image, video and PDF job matches their listed format range. A single supported image on a phone matches our current one-file workflow, with no daily cap and a report to save. A requirement for API or MCP access also points to their listed developer options.',
      ],
    },
    faqs: [
      { id: 'cleaner-free', q: 'Is AI Metadata Cleaner free?', a: 'It has a free tier with limits. Anonymous visitors can clean three images a day, one per run. After signing up the limit is ten a day. Pro is $10 a month or $99 a year, and Business is $49 a month with API access, as listed on their pricing page on 2026-10-26.' },
      { id: 'cleaner-c2pa', q: 'Does AI Metadata Cleaner remove C2PA Content Credentials?', a: 'Its site says it does, in the first line of the free plan. We copied that from the page on 2026-10-26 and did not run our own test on their tool. For our own behaviour: the JUMBF segment in a JPEG file is removed, and we do not promote that capability.' },
      { id: 'cleaner-video-pdf', q: 'Which tool handles video and PDF files?', a: 'Theirs, today. Their site lists video, PDF and RAW support, with those files processed on their server and deleted within minutes. Our video and PDF cleaning is not available yet, so for those formats this comparison ends at the table above.' },
    ],
  },
  deletefootprints: {
    key: 'deletefootprints',
    title: 'AI Metadata Remover vs DeleteFootprints — Comparison',
    description: 'Feature and price comparison with DeleteFootprints, read from its site on 2026-10-26. Processing location, batch limits, formats, reports.',
    articleDescription: 'Feature and price comparison with DeleteFootprints, read from its site on 2026-10-26. Processing location, batch limits, formats, reports.',
    h1: 'AI Metadata Remover vs DeleteFootprints',
    breadcrumbName: 'vs DeleteFootprints',
    lead: 'DeleteFootprints ran every cleaning job on its server when we opened it on 2026-10-26. It had no paid plan at that address. The table below records what we could read, including the three cells we could not.',
    byline: 'Checked 2026-10-26. Where a claim could not be opened, we say so instead of guessing.',
    selfName: 'AI Metadata Remover',
    rivalName: 'DeleteFootprints',
    featureParagraphs: [
      'Ten rows. One of them is a batch limit that is easy to misread.',
      'Server-side processing is the first distinction. DeleteFootprints says files are processed in temporary memory on its server, while supported images here are cleaned in the browser. Its listed input formats are JPG, JPEG, PNG, WebP, TIFF and HEIC. Our list is JPEG, PNG, WebP and HEIC, so TIFF is a concrete format difference rather than a variation in naming.',
      'Five files per run does not create five independent 100MB allowances. The 100MB figure is the total across that run, so batch size and combined file size need to be considered together. Our build takes one file per run, with no account or daily cap. The two tools therefore impose different constraints: theirs combines a five-file batch with a shared size total, while ours repeats single-file runs.',
      'Both pages expose before-and-after information in different forms. DeleteFootprints shows the comparison inside the page, but not as a file to keep. Our comparison is field by field, and its verification report downloads as HTML and JSON. No downloadable verification report was found on its site on the check date.',
      'DeleteFootprints lists upload scanning that shows “AI Tags Found”. Our tool has no detection hook. Its site also says the C2PA JUMBF is stripped; our tool removes the JUMBF segment in JPEG and does not market that behavior. These are separate rows because detection, inspection and metadata removal describe different parts of a workflow.',
      'The mobile and API/MCP cells remain unchecked. The pricing row combines two observations from the same date: its pricing address returned a 404, while its home page said Free with no account required. That records what was visible at those addresses without extending the statement to plans that might exist elsewhere.',
    ],
    rows: [
      { label: 'Processing location', self: 'Browser. Video and PDF not available yet.', rival: { text: 'Server side, files processed in temporary memory (their site, 2026-10-26)' } },
      { label: 'Batch limit', self: 'No daily cap, no account; one file per run today.', rival: { text: '5 files per run, and 100MB is the total for the run, not the limit per file (their FAQ, 2026-10-26)', note: true, strong: true } },
      { label: 'Formats', self: 'JPEG, PNG, WebP, HEIC', rival: { text: 'JPG, JPEG, PNG, WebP, TIFF, HEIC' } },
      { label: 'Before and after', self: 'Field by field, before and after columns', rival: { text: 'Yes, inside the page; not a file you can keep (their site, 2026-10-26)' } },
      { label: 'Downloadable verification report', self: 'Yes, HTML and JSON', rival: { text: 'None found on the site as of 2026-10-26' } },
      { label: 'Detection hook', self: 'None today', rival: { text: 'Yes: uploads are scanned and show “AI Tags Found” (their site, 2026-10-26)' } },
      { label: 'C2PA', self: 'JUMBF segment in JPEG is removed; not marketed.', rival: { text: 'Its site says the C2PA JUMBF is stripped (their site, 2026-10-26)' } },
      { label: 'Mobile', self: 'Built mobile first', rival: { text: '', checked: false } },
      { label: 'Pricing', self: 'Free, no account', rival: { text: 'No paid plan was live at its /pricing on 2026-10-26: the URL returned a 404 and the home page says Free with no account required.' } },
      { label: 'API and MCP', self: 'None today', rival: { text: '', checked: false } },
    ],
    differences: {
      heading: 'What we do differently',
      paragraphs: [
        'We built for a phone screen first, because that is where the file usually is. Every clean comes with a report you can download and keep, in HTML and JSON. And there is no account and no daily cap, while each run still takes one file in our current build.',
        'DeleteFootprints processes on its server and allows five files in a run, subject to the shared 100MB total. Our workflow keeps supported images in the browser and repeats one file at a time. Its comparison stays inside the page; ours adds a report that can be saved in either of two formats.',
        'The no-account statement has the same practical effect on both home pages: neither requires registration to begin. The difference is the daily allowance. This site states no daily cap, while the batch and combined-size limits in their FAQ apply to each run.',
      ],
    },
    limits: [
      COMMON_LIMIT,
      'Our current format list is limited to JPEG, PNG, WebP and HEIC, and video and PDF are not available yet. TIFF support and upload scanning are listed for the other tool, not this one. The downloadable report documents the fields our parser found and the result of cleaning; it does not add a detector or support another container.',
    ],
    fit: {
      heading: 'When another tool is the better fit',
      paragraphs: [
        'If you need a detector that tells you whether an upload looks AI before you clean it, this site has no such hook and theirs does. If TIFF is in your pipeline, theirs reads it and ours does not.',
        'A batch of up to five files also fits their stated per-run workflow when the files together stay within 100MB. A single JPEG, PNG, WebP or HEIC fits our browser workflow, especially when you want HTML and JSON reports without an account. The decision can therefore be made from the container, the need for scanning, and the batch total shown above.',
      ],
    },
    faqs: [
      { id: 'deletefootprints-free', q: 'Is DeleteFootprints free?', a: 'Its home page says Free with no account required, and its /pricing address returned a 404 on 2026-10-26. That is all we can state: no paid plan was live where we looked, and we are not claiming none exists.' },
      { id: 'deletefootprints-batch', q: 'How many files can DeleteFootprints clean at once?', a: 'Five per run. The 100MB figure on its site is the total for that run, not a per-file ceiling, so five 50MB files would not all go through in one batch. We copied that from its FAQ on 2026-10-26.' },
      { id: 'deletefootprints-retention', q: 'Does DeleteFootprints keep my files?', a: 'Its site says files are processed in temporary memory. We did not test how long that memory is held, so we are not repeating a deletion window as if we measured it. If that matters to you, ask them directly.' },
    ],
  },
  exifremover: {
    key: 'exifremover',
    title: 'AI Metadata Remover vs EXIF Remover — Comparison',
    description: 'Feature comparison with EXIF Remover, read from its site on 2026-10-26. Where its processing runs, what it says it handles, and what it does not list.',
    articleDescription: 'Feature comparison with EXIF Remover, read from its site on 2026-10-26. Where its processing runs, what it says it handles, and what it does not list.',
    h1: 'AI Metadata Remover vs EXIF Remover',
    breadcrumbName: 'vs EXIF Remover',
    lead: 'EXIF Remover says every file it takes is processed locally, in WebAssembly, including video and PDF. We read that on its site on 2026-10-26. Because we did not watch a file being processed, that sentence is recorded below as its claim, not as a measurement.',
    byline: 'Checked 2026-10-26. Claims are labelled as claims.',
    selfName: 'AI Metadata Remover',
    rivalName: 'EXIF Remover',
    featureParagraphs: [
      'Two rows on this page are their claims, and they are marked.',
      'Both tools describe local processing for images, but EXIF Remover also claims a WebAssembly path for video and PDF. We did not independently verify that path, so the processing cell retains its attribution. The formats cell is marked for the same reason: it records what its site lists, including GIF and AVIF images, MP4 and MOV video, and PDF. Our supported list remains JPEG, PNG, WebP and HEIC.',
      'The batch figures are stated differently. EXIF Remover lists twenty files per run with a 50MB ceiling for each file. Our current build takes one file per run and has no account or daily cap. The 50MB figure applies to each file under its listing; it is not presented as a shared batch total.',
      'For review, its site provides a searchable tag and value list. Our comparison uses before-and-after columns and adds downloadable HTML and JSON reports. No downloadable verification report was found on its site on the check date. Neither tool lists a detection hook, so inspection should not be confused with a separate AI detector.',
      'C2PA and Content Credentials were not mentioned on the EXIF Remover home page we read. That absence does not establish what its build does with a JUMBF segment. Our own JPEG behavior is stated separately: the JUMBF segment is removed and we do not market that as a feature.',
      'Three cells use the unchecked sentence: mobile, pricing, and API/MCP. The pricing cell also records that no pricing entry appeared in the page text read. These statements describe gaps in the checked material, not assertions about functions or plans elsewhere. The claim labels and unchecked cells keep those two kinds of limitation distinct.',
    ],
    rows: [
      { label: 'Processing location', self: 'Browser. Video and PDF not available yet.', rival: { text: 'Says all processing is local, in WebAssembly, for images, video and PDF (its site, 2026-10-26). We did not independently verify the video and PDF path.', claim: 'local-processing' } },
      { label: 'Batch limit', self: 'No daily cap, no account; one file per run today.', rival: { text: '20 files per run, 50MB each (its site, 2026-10-26)' } },
      { label: 'Formats', self: 'JPEG, PNG, WebP, HEIC', rival: { text: 'Images JPEG, PNG, WebP, HEIC, GIF, AVIF; video MP4, MOV; PDF (its site, 2026-10-26)', claim: 'local-processing' } },
      { label: 'Before and after', self: 'Field by field, before and after columns', rival: { text: 'Tag and value list, searchable (its site, 2026-10-26)' } },
      { label: 'Downloadable verification report', self: 'Yes, HTML and JSON', rival: { text: 'None found on the site as of 2026-10-26' } },
      { label: 'Detection hook', self: 'None today', rival: { text: 'None' } },
      { label: 'C2PA', self: 'JUMBF segment in JPEG is removed; not marketed.', rival: { text: 'C2PA and Content Credentials are not mentioned anywhere on its home page (2026-10-26)' } },
      { label: 'Mobile', self: 'Built mobile first', rival: { text: '', checked: false } },
      { label: 'Pricing', self: 'Free, no account', rival: { text: 'No pricing entry was present in the page text we read.', checked: false } },
      { label: 'API and MCP', self: 'None today', rival: { text: '', checked: false } },
    ],
    differences: {
      heading: 'What we do differently',
      paragraphs: [
        'We ship a report you can save, in HTML and JSON; its tag list lives on the page and stays there. And the page you are reading is built for a phone, while we could not read any mobile claim on theirs. Two things, not three.',
        'Those two differences concern what happens after inspection and what could be confirmed about the reading experience. Our before-and-after field list is paired with files you can keep. Their searchable list serves inspection inside the page, and no downloadable verification report was found during the check.',
        'On mobile, we state our own design choice and leave their cell unchecked rather than inferring one from a desktop page. Both sites list free browser-based image workflows and no detection hook, so there is no third distinction added here.',
      ],
    },
    limits: [
      COMMON_LIMIT,
      'Video and PDF are not available in our current build, regardless of the other site’s local-processing claim. Our supported image containers are the four shown in the table. A saved report records metadata fields before and after cleaning; it does not test a pixel watermark, change a platform label, or establish how another tool handles a format.',
    ],
    fit: {
      heading: 'When another tool is the better fit',
      paragraphs: [
        'If you need video or PDF handled in the same session as your images, and its local-processing claim holds for those formats, it is the broader tool of the two. We have not tested those formats on it, so that is a recommendation with a condition attached.',
        'Its listed twenty-file batch and per-file 50MB ceiling may also suit a multi-file session. Our workflow fits one supported image per run when you want no account, no daily cap, and a report in HTML or JSON. GIF, AVIF, MP4 and MOV appear in its format list, so those containers lead to the same conditional choice as PDF.',
      ],
    },
    faqs: [
      { id: 'exifremover-local', q: 'Does EXIF Remover process files on my device?', a: 'That is what its site says: all processing local, in WebAssembly, for images, video and PDF. We recorded the claim on 2026-10-26 and did not run our own check on its build, so treat it as their statement rather than a measurement.' },
      { id: 'exifremover-c2pa', q: 'Does EXIF Remover remove C2PA Content Credentials?', a: 'Its home page does not mention C2PA or Content Credentials on 2026-10-26, so we cannot say either way. What we do know is that the JUMBF segment in a JPEG is removed by our tool, and that we do not promote that capability.' },
      { id: 'exifremover-batch', q: 'How many files can EXIF Remover handle at once?', a: 'Twenty per run, with a 50MB ceiling for each file, as listed on its site on 2026-10-26. Our current build takes one file per run and has no daily limit.' },
    ],
    claims: ['local-processing'],
  },
};
