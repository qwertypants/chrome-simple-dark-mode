# Shade Toggle privacy policy

Effective 2026-10-28. Applies to Shade Toggle 0.1.0.

Shade Toggle changes website appearance locally and remembers one dark-mode choice
per exact hostname. It has no account, analytics, advertising, telemetry, or payment.
It does not transmit, sell, or share website content or browsing information.

When you enable it, its bundled rendering engine reads page structure, text/style
properties and style sheets to calculate dark colors in your browser. Page content
is processed locally, not retained by Shade Toggle. Engine network transport is
disabled; inaccessible cross-origin style sheets may limit rendering. The websites
you visit continue their own normal network activity under their own policies.

The extension stores enabled hostnames and associated preferences in Chrome's
local extension storage, not Chrome sync. It checks the selected tab's URL to identify
its hostname and protected pages. Site grants are managed by Chrome. Turning a site
off removes its enabled preference and rendering; Chrome's site grant may remain
until you revoke it through extension site-access settings. Uninstalling removes the
extension's local storage through Chrome. Actual uninstall cleanup remains a manual
release verification item.

Permissions: activeTab identifies the selected site following your action; scripting
injects and removes the bundled renderer; storage remembers choices; optional site
access lets a granted site retain its choice on subsequent loads. Access is requested
when enabling a site, not granted for all sites at installation.

The GitHub Pages information site uses no project analytics, cookies or external
fonts. GitHub may process standard hosting request information under its own
[privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

Questions or requests: use the project's
[GitHub issues](https://github.com/qwertypants/chrome-simple-dark-mode/issues).
Avoid posting private page contents. For sensitive reports use the route in SECURITY.md.
Policy changes will be dated here and recorded in the changelog.

Intended public URL: https://qwertypants.github.io/chrome-simple-dark-mode/privacy.html
Published and verified at https://qwertypants.github.io/chrome-simple-dark-mode/privacy.html on 2026-10-28.
