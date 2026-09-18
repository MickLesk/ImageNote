# Changelog

All notable changes to ImageNote are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-09-18

### Added

- `custom:imagenote-card` — a picture with a note on its back.
- Transitions: 3D flip, crossfade, slide, cube, none; horizontal or vertical.
- Picture from an upload (stored by Home Assistant), a URL, a `/local/` path,
  a `media-source://` id or an `image`, `camera` or `person` entity.
- Notes in Markdown from the card config, or read from an `input_text` / `text`
  entity and edited directly on the card.
- Visual editor with picture upload, live preview and all options.
- Auto flip, hover flip, keyboard support, reduced-motion fallback,
  English and German UI.
- `tap_action`, `hold_action` and `double_tap_action` with the standard
  Home Assistant actions (more-info, toggle, navigate, url, perform-action)
  plus `flip`.
- "Updated … ago" line on the note side when the note comes from an entity.
- Browser smoke tests with Playwright, run in CI.
