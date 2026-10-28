# Store screenshot provenance

`fixture-dark.png` is a 1280 × 800 PNG captured on 2026-10-28 from an actual installed
Shade Toggle lifecycle-test extension in Playwright Chromium 156.0.8078.4. It shows
our original `tests/fixtures/contrast.html` after the production background/content
renderer enabled dark mode. The test manifest pregrants localhost, and an extension
control page sends the production `site:set` protocol. No page content/colors or
browser chrome were fabricated, added or retouched. This is a full viewport page
capture; it does not show a browser toolbar, native permission prompt or Chrome stable.
It demonstrates fixture rendering, not universal website compatibility.

The 128px icon is `extension/icons/icon-128.png`. Homepage arXiv images have separate
provenance and are not used as installed-extension store evidence.
