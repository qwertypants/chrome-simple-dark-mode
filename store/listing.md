# Draft Chrome Web Store listing

Not submitted. Version 0.1.0. User price: free. Category suggestion: Accessibility.
Name: Shade Toggle
Summary: One remembered dark-mode choice per website.

## Full description

Give bright websites a darker appearance with one simple toggle.

Open Shade Toggle on a website, turn on Dark mode, and approve access for that site.
Your choice is remembered for that exact hostname. Turn it off to restore the page.
Already-dark websites keep their own theme.

No account, subscriptions or settings screen. Preferences stay in Chrome's local
storage. Page structure and styles are processed locally by a bundled rendering
engine. Shade Toggle does not transmit page content, track browsing or run remote code.

Chrome's protected pages, the Chrome Web Store, PDFs and non-web pages cannot be
changed. Complex websites may render imperfectly. Contrast tests cover controlled
fixtures and popup states, not every website or full ADA/WCAG certification.

Independent open-source project using Dark Reader, with no affiliation or endorsement.
Source and support: https://github.com/qwertypants/chrome-simple-dark-mode

## Single purpose and permissions

Single purpose: apply and remember one dark-mode choice per website.

| Permission | Why it is needed |
| --- | --- |
| activeTab | Identify the current website following the user's toolbar action and check whether it is supported. |
| scripting | Inject/remove the local renderer and register it for subsequent loads of granted enabled sites. |
| storage | Save exact-host preferences in Chrome local extension storage. |
| Optional *://*/* access | Request access for the selected hostname when enabled, allowing its preference to apply on future loads. Broad optional declaration supports user-chosen websites; it is not a blanket install-time grant. |

## Privacy practices draft

The renderer accesses website structure, style information and the current URL locally.
Do not describe this as never handling website data. No data is transmitted to the
developer or third parties by the extension; no sale, advertising, profiling or analytics.
No remotely hosted executable code; all runtime logic is bundled. Complete the dashboard's
current data-use fields against the final artifact and local-processing policy guidance.
Do not automatically select all "no data" answers without checking those definitions.

Policy URL: https://qwertypants.github.io/chrome-simple-dark-mode/privacy.html
Pending deployment and public verification. Source: PRIVACY.md.

## Assets and publisher

128px store icon: ../extension/icons/icon-128.png, also in release ZIP.
Required screenshot: assets/fixture-dark.png, 1280 × 800, actual installed Chromium
fixture rendering. See assets/README.md for exact capture limitations. No optional
promotional graphic included. Homepage arXiv examples are not store installation proof.

Publisher account, durable contact email, distribution regions, final category and
visibility must be chosen in the developer dashboard by the owner. New registration
costs US$5 once, separate from the free user price. Two-step verification is required.
Verify current dashboard requirements at submission. No account access or payment occurred.

Official sources checked 2026-10-28:
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- https://developer.chrome.com/docs/webstore/register
- https://developer.chrome.com/blog/cws-role-expansion-developer-dashboard
- https://developer.chrome.com/docs/webstore/program-policies/two-step-verification
