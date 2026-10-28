# Verification record — 2026-10-28

`npm test` passed 5 unit tests. `npm run test:extension` passed 5 installed-extension tests in Playwright Chromium 156.0.8078.4. Lifecycle tests use production background/content code with a test-only localhost host grant; rendering diagnostics have separate test entrypoints. Neither change ships in `dist/`.

Coverage includes actual browser close/relaunch using the same profile, worker stop/restart, exact-host preferences, revocation and denied access, PDF refusal, native dark detection, SPA theme changes, open shadow DOM, 10,000 inserted nodes, popup keyboard states, alpha-composited contrast, and cleanup after disabling. Images and a local video preserve screenshot pixels. The rendering test records no new cross-origin CSS request after enabling and no injected page-world proxy script.

## Measured contrast

The installed production content fixture measures computed foreground against background composited through all ancestor surfaces, including nested transparent surfaces. Normal text requires 4.5:1, large heading 3:1, input boundary and focus outline 3:1. Results: article/heading 12.10; link 7.41; red 4.99; green 11.28; purple on nested transparency 5.15; input/button/dialog 11.26; placeholder 7.75; code 8.89; menu 10.91; input boundary 3.07; button focus 16.85. The test originally caught a 2.60:1 focus outline; the engine-owned override now sets a white focus-visible outline and is removed when disabled.

Popup tests cover off/on/already-dark/pending/denial/failure/protected/PDF states: text minimum 9.67:1, control minimum 5.84:1, focus minimum 13.02:1. These checks target WCAG 2.2 AA contrast thresholds on tested surfaces. They do not establish ADA compliance or guarantee accessibility or contrast on arbitrary websites, gradients, background images, closed shadow roots, canvas or blended content.

## Stable Chrome and external pages

Chrome stable 156.0.8078.48 launched with the production `dist/` build, but no extension service worker appeared with `--load-extension` / `--disable-extensions-except`. Consequently a stable Chrome installed-extension smoke test remains **unverified**. Load `dist/` manually using chrome://extensions, Developer mode, Load unpacked, and run the following matrix before publishing.

| Category | Exact URL | Network navigation outcome | Extension inspection |
|---|---|---|---|
| Article | https://en.wikipedia.org/wiki/Dark_mode | HTTP 200, Dark mode - Wikipedia | Blocked by extension load failure |
| Documentation | https://developer.mozilla.org/en-US/docs/Web/CSS | HTTP 200, CSS: Cascading Style Sheets | Blocked |
| Search | https://www.google.com/search?q=web+accessibility | HTTP 200; result title was request URL, search content not validated | Blocked |
| Shopping | https://www.etsy.com/ | HTTP 403 | Blocked |
| Media | https://www.youtube.com/ | HTTP 200, YouTube | Blocked |
| SPA | https://app.excalidraw.com/ | HTTP 200, Excalidraw+ | Blocked |

Manually inspect article, link, input/placeholder, menu/dialog, code, keyboard focus, photos/video, and native dark behavior. Test permission denial, removal through Chrome, and subsequent reload. Automated disable cleanup is verified; actual uninstall behavior remains unverified.

## Package

`npm run package` rebuilds `dist/` and writes `release/shade-toggle-0.1.0.zip`. The explicit file allowlist contains production manifest/background/content/popup, four local icons, project LICENSE, THIRD_PARTY_NOTICES.md and the full bundled Dark Reader license. No test workers, localhost grants, source maps, development files, or remote scripts ship. Production has only activeTab/scripting/storage at install and optional website access. Engine network transport is disabled.

Two independent build/package runs compared byte-for-byte equal using `cmp`. SHA-256 at this verification point: `6a694f03f9db18d6a1fa46a1f7a675618010e2bbfd93e0d27ac1224f2a412a26` after final license/notice additions. ZIP timestamps and permissions are fixed; Python 3 and Node with installed lockfile dependencies are required.

## Homepage and publication preparation

Static homepage checked in actual Chromium at 1280px and 375px widths: images decode,
no horizontal overflow, keyboard skip link focuses/activates, disclosure control opens,
privacy route loads, and no JavaScript errors. Screenshots were visually inspected.
The homepage has no runtime JavaScript or third-party font requests. Text, muted text
and link colors meet AA on the declared opaque backgrounds; this is a bounded check,
not a complete WCAG audit. Store screenshot is actual installed Chromium rendering
of an original contrast fixture at 1280 × 800, with pregranted localhost access; see
store/assets/README.md. It does not verify Chrome stable or the native permission prompt.

Public GitHub Pages deployment and Chrome Web Store submission/approval/live installation
have not occurred. The policy URL remains pending deployment. Owner review of publisher
identity, final artifact, disclosures, permissions and required manual checks is outstanding.

## Merge verification follow-up

On the merge commit, the native-theme idle-stability test intermittently found Dark Reader's style node being replaced. Root cause: the controller captured every `load` event, including `load` events from its own injected `<style>` elements, and reevaluated native appearance. The listener now reacts only to website stylesheet `<link>` loads. After the fix, `npm run test:extension` passed 5/5, and `npx playwright test tests/extension/native-dark.spec.js --repeat-each=3` passed 3/3. The unit suite passed 5/5. The release ZIP hash was regenerated after this fix.
