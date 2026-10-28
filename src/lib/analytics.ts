import type { EventName, PageId, PlanState } from './analytics.events';

const ALLOW = new Set([
  'page_id',
  'variant',
  'plan_state',
  'cta',
  'intent',
  'referrer_path',
  'slot_id',
  'state',
  'segments_removed',
  'segments_left',
  'has_c2pa',
  'has_sd_text',
  'gen_ms',
  'from',
  'format',
  'reason',
]);

const queue: Record<string, unknown>[] = [];
const ANALYTICS_ENDPOINT = '';
let sessionId: string | undefined;

function session(): string {
  if (!sessionId) {
    try {
      sessionId = sessionStorage.getItem('sid') ?? crypto.randomUUID();
      sessionStorage.setItem('sid', sessionId);
    } catch {
      sessionId = crypto.randomUUID();
    }
  }
  return sessionId;
}

export function track(name: EventName, props: Record<string, unknown> = {}): void {
  const clean: Record<string, unknown> = { event: name, session_id: session(), ts: Date.now() };
  for (const [key, value] of Object.entries(props)) {
    if (ALLOW.has(key)) clean[key] = value;
  }
  if (!clean.plan_state) clean.plan_state = 'anonymous' satisfies PlanState;
  queue.push(clean);
  if (queue.length > 50) queue.shift();
  if (!ANALYTICS_ENDPOINT) return;
  try {
    navigator.sendBeacon(ANALYTICS_ENDPOINT, JSON.stringify(clean));
  } catch {
    return;
  }
}

export function queueSnapshot(): readonly Record<string, unknown>[] {
  return queue;
}

const seen = new Set<string>();

function observeImpressions(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio < 0.5) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        const key = element.dataset.proCard
          ? `pro:${element.dataset.pageId}:${element.dataset.proCard}`
          : `ad:${element.dataset.pageId}:${element.dataset.adSlot}`;
        if (seen.has(key)) continue;
        setTimeout(() => {
          seen.add(key);
          if (element.dataset.proCard) {
            track('pro_card_impression', {
              page_id: element.dataset.pageId as PageId,
              variant: element.dataset.proCard,
            });
          } else {
            track('ad_slot_impression', {
              page_id: element.dataset.pageId as PageId,
              slot_id: element.dataset.adSlot,
            });
          }
        }, 1000);
      }
    },
    { threshold: [0.5] },
  );
  document.querySelectorAll('[data-pro-card],[data-ad-slot]').forEach((element) => observer.observe(element));

  document.querySelectorAll<HTMLElement>('[data-track-click]').forEach((element) => {
    element.addEventListener('click', () => {
      const cta = element.dataset.trackClick;
      track('pro_card_click', {
        page_id: element.dataset.pageId as PageId,
        variant: element.dataset.variant,
        cta,
      });
      track('waitlist_click', {
        page_id: element.dataset.pageId as PageId,
        variant: element.dataset.variant,
        intent: cta === 'lock_price' ? 'lock_price' : 'waitlist',
      });
    });
  });

  document.querySelectorAll<HTMLFormElement>('[data-waitlist-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      track('waitlist_click', {
        page_id: form.dataset.pageId as PageId,
        variant: form.dataset.variant,
        intent: form.dataset.intent === 'lock_price' ? 'lock_price' : 'waitlist',
      });
      form.querySelector('input')?.setAttribute('disabled', '');
      const success = form.querySelector<HTMLElement>('[data-waitlist-success]');
      if (success) success.hidden = false;
    });
  });

  function focusWaitlist(): void {
    if (window.location.hash !== '#waitlist') return;
    const form = document.querySelector<HTMLFormElement>('[data-waitlist-form]');
    if (!form) return;
    form.dataset.intent = 'lock_price';
    form.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
  }
  focusWaitlist();
  window.addEventListener('hashchange', focusWaitlist);

  const path = window.location.pathname;
  if (path === '/pricing/' || path === '/pricing') {
    let referrerPath = '';
    try {
      referrerPath = document.referrer ? new URL(document.referrer).pathname : '';
    } catch {
      referrerPath = '';
    }
    track('pricing_page_view', { page_id: 'pricing', referrer_path: referrerPath });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeImpressions, { once: true });
} else {
  observeImpressions();
}
