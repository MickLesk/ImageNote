# Contributing to Pinboard

Thanks for helping. This page explains how the repository is organised, how to
get a change in, and how releases are cut.

## Getting started

```bash
git clone https://github.com/MickLesk/pinboard-card.git
cd pinboard-card
npm ci
npm run build        # bundles src/ into dist/pinboard-card.js
npm run demo         # http://localhost:8765/demo/ with stubbed Home Assistant elements
npm test             # browser tests (once: npx playwright install chromium)
npm run validate     # typecheck, build, bundle checks and tests, as CI runs them
```

To try a build in a real Home Assistant, copy `dist/pinboard-card.js` to
`/config/www/` and add `/local/pinboard-card.js` as a *JavaScript module*
resource, or point HACS at your fork as a custom repository.

## Repository layout

| Path | Contents |
| --- | --- |
| `src/` | TypeScript sources. `pinboard-card.ts` registers the elements; `card.ts` is the card, `editor.ts` the visual editor. |
| `src/i18n.ts` | All user-facing strings, English and German. |
| `dist/` | The committed bundle HACS serves. CI fails when it is out of date. |
| `demo/` | A static page with minimal stand-ins for `ha-card`, `ha-icon`, `ha-markdown` and `ha-form`. Used by the tests and for screenshots. |
| `tests/` | Playwright smoke tests against the demo page, run with `node --test`. |
| `scripts/` | Build, bundle checks, demo server, changelog tooling. |
| `docs/images/` | Screenshots used in the README. |
| `.github/workflows/` | `validate.yml` (CI), `release.yml` (releases), `pages.yml` (publishes `demo/` and `dist/` to GitHub Pages on every push to `main`; needs Pages set to "GitHub Actions" once in the repository settings). |

## Branches

- `main` is always releasable. Nothing is pushed there directly; every change
  arrives through a pull request.
- Work on a branch named after the change: `feat/audio-pages`,
  `fix/section-height`, `docs/readme-markers`, `chore/ci-node-22`.
- Keep a branch to one topic. Two unrelated fixes are two branches and two
  pull requests.
- Rebase on `main` before opening the pull request so the history stays
  linear. Pull requests are squash-merged; the squash title becomes the commit
  on `main`, so give the pull request a good title.

## Commits and pull requests

- Commit titles are short and in the imperative: "Add audio pages",
  "Fix overflow in sections view". The body explains why, not what.
- Every pull request that changes behaviour adds a line to the `Unreleased`
  section of `CHANGELOG.md` under *Added*, *Changed* or *Fixed*.
- Run `npm run validate` before pushing. CI runs the same checks plus the
  HACS validation, and it rejects a stale `dist/` bundle: rebuild and commit
  it with your change.
- New behaviour comes with a test in `tests/smoke.test.mjs` and, when it is
  visible, with a card in `demo/index.html` so it can be looked at.
- New strings go into every language table in `src/i18n.ts` (English,
  German, Dutch, French, Spanish). English is the fallback, so a missing
  translation shows English rather than a key.
- New options get a row in the README options table and, where useful, an
  entry in the visual editor.

## Code style

- Plain custom elements in TypeScript, no framework. Keep it that way; the
  bundle stays small and there is nothing to keep in sync with Home
  Assistant's own Lit version.
- Strict TypeScript, no `any`. `npm run typecheck` must pass.
- Comments explain a decision or a non-obvious constraint, not what the next
  line does.
- Prefer CSS in `src/styles.ts` over inline styles; theme colours come from
  Home Assistant's CSS variables, with sensible fallbacks.
- Home Assistant APIs: use what built-in cards use (`ha-form`, `ha-markdown`,
  `hass.callWS`, the image and media upload endpoints). When you rely on
  something new, note the minimum Home Assistant version in `hacs.json`.

## Reporting bugs and proposing features

Use the issue templates. For bugs, include the card YAML, the Home Assistant
version, the browser, and what you saw. Screenshots help a lot.

## Releases

Releases follow [semantic versioning](https://semver.org/): a breaking change
to the YAML options bumps the major version, new options bump the minor, fixes
the patch. Pre-releases look like `0.3.0-beta.1`.

To cut a release:

1. Make sure `main` is green and the `Unreleased` section of `CHANGELOG.md`
   lists everything that shipped since the last version.
2. Open **Actions → Release → Run workflow**, enter the version (for example
   `0.3.0`) and tick *pre-release* for betas.

The workflow bumps `package.json`, moves the `Unreleased` notes under the new
version in `CHANGELOG.md`, rebuilds `dist/`, runs the tests, commits, tags
`vX.Y.Z`, creates the GitHub release with the changelog section as notes and
attaches `pinboard-card.js`. HACS picks up the release within a few hours.

Pushing a tag `vX.Y.Z` by hand also creates the release, provided
`package.json` already carries that version.

## License

By contributing you agree that your contribution is licensed under the MIT
license of this repository.
