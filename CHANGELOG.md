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
- Several pictures per card through `images`, each with its own note and
  title. Arrows, dots, swipe and arrow keys move between them; `auto_advance`
  runs a slideshow; pictures crossfade. The editor manages the pictures as
  tabs.
- Upload target per card: Home Assistant's image store or a folder in
  `/media`.
- Pictures can be reordered in the editor.
- Browser smoke tests with Playwright, run in CI.

### Fixed

- The card overflowed its rows in sections view because it kept its aspect
  ratio instead of filling the height Home Assistant assigned.
- The "Photo" badge and the dots no longer overlap a long note: the note side
  now has a footer, the text scrolls above it behind a fade.
- Small cards (layout editor preview, 4 columns) tighten paddings and shrink
  the badges to icons instead of truncating everything.
