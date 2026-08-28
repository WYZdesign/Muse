/**
 * Centralized URL configuration - single source of truth for all external URLs
 * All URLs should use these functions instead of hardcoded strings
 */

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://muse.wyzdesign.com";
}

function getMuseUrl(path: string = ""): string {
  const base = getBaseUrl();
  return `${base}/muse${path ? `/${path.replace(/^\//, "")}` : ""}`;
}

function getLandingUrl(path: string = ""): string {
  const base = getBaseUrl();
  return `${base}/muse/landing${path ? `/${path.replace(/^\//, "")}` : ""}`;
}

function getProfileUrl(userId: string | number, username?: string): string {
  return getMuseUrl(`profile/${userId}`);
}

function getPostUrl(postId: string | number): string {
  return getMuseUrl(`post/${postId}`);
}

function getCommunityUrl(communityId: string | number): string {
  return getMuseUrl(`community/${communityId}`);
}

function getEventUrl(eventId: string | number): string {
  return getMuseUrl(`event/${eventId}`);
}

function getProUrl(proId: string | number): string {
  return getMuseUrl(`pro/${proId}`);
}

function getTermsUrl(): string {
  return getMuseUrl("terms");
}

function getPrivacyUrl(): string {
  return getMuseUrl("privacy");
}

function getGuidelinesUrl(): string {
  return getMuseUrl("guidelines");
}

function getSafetyUrl(): string {
  return getMuseUrl("safety");
}

function getPricingUrl(): string {
  return getMuseUrl("pricing");
}

function getAboutUrl(): string {
  return getMuseUrl("about");
}

function getPressUrl(): string {
  return getMuseUrl("press");
}

function getCareersUrl(): string {
  return getMuseUrl("careers");
}

function getBlogUrl(): string {
  return getMuseUrl("blog");
}

function getFaqUrl(): string {
  return getMuseUrl("faq");
}

function getPressUrlAlt(): string {
  return getMuseUrl("press");
}

function getLandingShareUrl(source?: string): string {
  const base = getLandingUrl();
  return source ? `${base}?src=${source}` : base;
}

function getReferralUrl(code: string): string {
  return `${getMuseUrl()}?ref=${code}`;
}

function getProfileShareUrl(userId: string | number, ref?: string): string {
  const base = getProfileUrl(userId);
  return ref ? `${base}?ref=${ref}` : base;
}

function getPostShareUrl(postId: string | number): string {
  return getPostUrl(postId);
}

function getCommunityShareUrl(communityId: string | number): string {
  return getCommunityUrl(communityId);
}

function getEventShareUrl(eventId: string | number): string {
  return getEventUrl(eventId);
}

function getProShareUrl(proId: string | number): string {
  return getProUrl(proId);
}

function getProShareUrlWithRef(proId: string | number, refName: string): string {
  return `${getProUrl(proId)}?ref=${refName}`;
}

export {
  getBaseUrl,
  getMuseUrl,
  getLandingUrl,
  getProfileUrl,
  getPostUrl,
  getCommunityUrl,
  getEventUrl,
  getProUrl,
  getTermsUrl,
  getPrivacyUrl,
  getGuidelinesUrl,
  getSafetyUrl,
  getPricingUrl,
  getAboutUrl,
  getPressUrl,
  getPressUrlAlt,
  getCareersUrl,
  getBlogUrl,
  getFaqUrl,
  getLandingShareUrl,
  getReferralUrl,
  getProfileShareUrl,
  getPostShareUrl,
  getCommunityShareUrl,
  getEventShareUrl,
  getProShareUrl,
  getProShareUrlWithRef,
};