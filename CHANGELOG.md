# Changelog

All notable changes to Pinboard are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Conditional pages: `visible` on a page shows it only while an entity has
  (or does not have) a state.
- Per-page `tap_action`, `hold_action` and `double_tap_action`.
- The editor groups page and card settings into sections: picture, note,
  audio, display, visibility, actions; appearance, navigation, notes and
  to-do lists, uploads, actions.
- To-do lists as pages: `todo_entity` shows a `todo.*` list as a checklist,
  ticks and new items go to the list through Home Assistant's to-do services.

### Changed

- Cards skip all work on state changes that do not touch one of their
  entities, which keeps dashboards with many cards responsive.
- Checklists in notes from the card configuration are read-only. Ticks used
  to be remembered per browser, which was easy to lose and never shared;
  use a to-do list or an `input_text` note instead.

### Fixed

- Swiping over a card with several pages turned the dashboard view instead of
  the page when a swipe-navigation plugin was installed. Touches on such a
  card now stay inside it; `swipe: false` restores the old behaviour.

## [0.1.0] - 2026-09-18

First release. Pinboard started as "ImageNote"; the card type is
`custom:pinboard-card` and the resource is `pinboard-card.js`.

### Added

- `custom:pinboard-card` — a picture with a note on its back, and up to ten
  pictures, notes and recordings in any order.
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
- Up to ten pictures and notes per card in any order through `slides`
  (`images` still works). Every tap, swipe, arrow, dot or key turns to the
  next one with the chosen animation, in the direction of travel; `auto_flip`
  runs a slideshow. The editor manages them as entries with "+ Picture" and
  "+ Note".
- `layout: grid` shows the entries side by side as tiles inside one card,
  each turning on its own; `columns` fixes the tiles per row.
- Checklists in notes: `- [ ]` lines become checkboxes, written back to
  `input_text` / `text` entities or remembered in the browser.
- Templates in notes are rendered by Home Assistant and update live.
- `expires` per entry with "Until …" in the footer; expired pages are dimmed
  and tagged or hidden (`expired_slides`).
- `color` per note page and a `sticky` note style.
- Audio pages with a player: record in the editor, upload a file, or record
  on the card into an `input_text` (`audio_entity`).
- Markers: numbered or icon pins on a picture with a label, optionally an
  entity state and more-info. Placed by clicking in the editor.
- Camera button on pictures from an `input_text` / `text` entity: takes or
  picks a photo, uploads it and writes the address into the entity.
- `ken_burns` slow zoom on pictures.
- Uploaded and captured pictures are scaled down to `upload_max_size`
  (1920 px by default) before upload.
- Editor: drag-and-drop ordering of entries, import of all pictures in a
  media folder, a live preview with a "Play animation" button, and
  `upload_crop` to crop uploads to the card's aspect ratio.
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
