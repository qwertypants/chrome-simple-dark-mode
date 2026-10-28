export function classifySite(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return {supported: false, reason: 'This page cannot be changed.'};
    if (url.hostname === 'chromewebstore.google.com' || (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) return {supported: false, reason: 'Chrome protects the Web Store.'};
    return {supported: true, hostname: url.hostname, originPattern: `*://${url.hostname}/*`};
  } catch { return {supported: false, reason: 'This page has no supported website address.'}; }
}
