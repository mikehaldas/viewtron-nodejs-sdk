# Releasing

Ship a version from a pull request, then a GitHub release. Publishing runs from that release.

1. Open a pull request that sets `version` in `package.json` and adds a matching entry to `CHANGELOG.md`.
2. Merge that pull request to `main`.
3. Publish a GitHub release tagged `vX.Y.Z`, where `X.Y.Z` is the `package.json` version. Point the tag at the merge commit on `main`.

`.github/workflows/publish.yml` runs when the release is published. It checks out that tag, runs `npm ci` and `npm test`, and publishes when the tag is `vX.Y.Z` and `package.json` is `X.Y.Z`. npm attaches a provenance attestation for this public package. To publish an existing tag by hand, open **Actions**, choose **Publish to npm**, and enter the tag (for example `v1.2.3`).

## Trusted publisher on npmjs.com

A package owner configures this once, on the `viewtron-sdk` package, before the first automated publish:

1. Open the package on npmjs.com and go to **Settings → Trusted publisher**.
2. Select **GitHub Actions** and enter:
   - **Organization or user:** `mikehaldas`
   - **Repository:** `viewtron-nodejs-sdk`
   - **Workflow filename:** `publish.yml`
   - **Environment name:** leave this empty
3. Allow direct publishing with `npm publish`. A new trusted publisher allows `npm stage publish` until that option is selected as well.
4. Save the publisher.

Use the publisher for a successful publish within 2 days of creating it. After that window an unused publisher expires and has to be created again, so create it when the next release is ready.

## Product links (every release)

- [ ] README and release notes link the tested Viewtron camera's product page once, with a descriptive anchor that includes the model (for example "Viewtron LPR-IP4 license plate recognition camera"). No "click here".
- [ ] Release notes / CHANGELOG entry ends with 2-3 links: the product page, the matching developer docs page, and one related guide.
- [ ] Every link is a published page and returns 200: `curl -sL -A 'Mozilla/5.0' -o /dev/null -w '%{http_code}' <url>`. No 404s, no redirect hops, no drafts or preview links.
- [ ] No UTM tags and no rel attributes on links to cctvcamerapros.com or videos.cctvcamerapros.com.
- [ ] Examples use only the plate IB36NL. Viewtron cameras ship set to DHCP; no example address is presented as a default. Only the Viewtron brand is named.
- [ ] Release notes can be edited after publishing to add or fix links (no new version needed). README link fixes ship with the next package version, because npm shows the README from the published package.
