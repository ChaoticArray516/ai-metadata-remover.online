export const EVENTS = {
  proCardImpression: 'pro_card_impression',
  proCardClick: 'pro_card_click',
  waitlistClick: 'waitlist_click',
  pricingPageView: 'pricing_page_view',
  adSlotImpression: 'ad_slot_impression',
  reportGenerated: 'report_generated',
  reportDownloaded: 'report_downloaded',
  reportExpanded: 'report_expanded',
  reportCtaClicked: 'report_cta_clicked',
  reportRetryClicked: 'report_retry_clicked',
  reportFailed: 'report_failed',
  // Definitions only: 3a produces no checkout calls (F27). Any track('checkout_*') call is a P0 violation.
  checkoutStarted: 'checkout_started',
  checkoutCardSaved: 'checkout_card_saved',
  proCancel: 'pro_cancel',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
export type PlanState = 'anonymous' | 'free' | 'card_saved' | 'paying' | 'cancelled';
export type PageId = 'home' | 'photo' | 'pricing';
export type CardVariant = 'result' | 'pricing' | 'waitlist';
