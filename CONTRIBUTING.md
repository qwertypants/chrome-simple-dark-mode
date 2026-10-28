# Contributing

Open an issue to discuss substantial changes. Keep the product to one remembered
website toggle, without accounts, tracking, remote code or an options screen.

Use Node 22+, `npm ci`, `npm test` and `npm run test:extension`. Install the Playwright
browser with `npx playwright install chromium`. Build with `npm run build`; package
with `npm run package` and Python 3. Include behavior, accessibility and privacy impacts
in your pull request. Never commit profiles, private URLs, credentials or generated
artifacts. Use synthetic fixtures for tests and bug reports.

Changing Dark Reader requires reviewing its full license and the exact-hash proxy
patch in scripts/build.mjs, then rerunning rendering/network/cleanup and contrast checks.
Reviewers must inspect production dist and ZIP, not only test builds.

Contributions are provided under the project MIT license. Retain third-party notices.
Maintainers review contributions as time permits; no response-time guarantee is offered.
