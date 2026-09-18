<h1 align="center">ImageNote</h1>

<p align="center">
  A picture with a note on its back. Tap the card and it flips over.<br>
  A Home Assistant dashboard card, installable through HACS.
</p>

ImageNote pairs pictures with notes. The simplest card shows a picture in
front and a note on its back; a tap (or a key press, a hover, or a timer) turns
it over with a 3D flip, a crossfade, a slide or a cube rotation. A card can
also hold up to ten pictures and notes in any order, and every tap turns to the
next one.

Typical uses: the fridge with the shopping list on its back, the boiler with the
last service date, a plant with its watering schedule, a family photo with a
message for the wall panel.

![Picture side, note side and a gallery of several pictures](docs/images/cards.png)

<p align="center">
  <img src="docs/images/flip.png" alt="The card halfway through its 3D flip" width="420">
</p>

## Features

- **Upload a picture from the editor** — stored by Home Assistant, no `www`
  folder needed. URLs, `/local/` paths, `media-source://` ids and `image`,
  `camera` or `person` entities work too.
- **Notes in Markdown** — bold, lists, links, plus **checklists** you can tick
  on the card and **templates** such as `{{ states('sensor.boiler') }}` that
  follow state changes.
- **Notes with a shelf life and a colour** — `expires` dims or hides a note
  after a date, `color` tints the page, and the sticky-note look makes notes
  read like a note on the fridge.
- **Edit the note on the card** — link an `input_text` or `text` entity and a
  pencil appears on the note side. Changes are saved with `set_value`, so
  automations and other dashboards see them immediately.
- **Up to ten pictures and notes per card, in any order** — picture, note,
  note, picture … Tap, swipe, arrows, dots, arrow keys or a timer move on to
  the next one. Or show them side by side as tiles that flip independently.
- **Markers on the picture** — numbered pins or icons with a label
  ("here is the stopcock"), optionally showing an entity's state and opening
  its more-info dialog. Placed by clicking in the editor.
- **A camera button on the card** — when a picture comes from an
  `input_text` entity, a tap on the camera takes or picks a new photo, uploads
  it and stores its address in the entity. No editor needed.
- **Ken Burns** — a slow zoom and pan on pictures for wall panels.
- **Five transitions** — `flip` (3D, default), `fade`, `slide`, `cube`, `none`;
  horizontal or vertical. Respects `prefers-reduced-motion`.
- **Fits every layout** — fixed aspect ratios or the picture's natural size,
  masonry and sections views, phone and wall panel.
- **Visual editor** for every option, English and German UI, keyboard access.

## Installation

### HACS

1. Open HACS, three-dot menu, **Custom repositories**.
2. Add `https://github.com/MickLesk/ImageNote`, category **Dashboard**.
3. Install **ImageNote** and reload the browser when HACS asks.

HACS registers the resource automatically. If you manage resources yourself,
add `/hacsfiles/ImageNote/imagenote-card.js` as a *JavaScript module*.

### Manual

Copy `dist/imagenote-card.js` to `/config/www/imagenote-card.js` and add
`/local/imagenote-card.js` under **Settings → Dashboards → Resources** as a
*JavaScript module*.

Requires Home Assistant 2024.10 or newer.

## Usage

Add the card from the card picker (**ImageNote Card**) and fill in the editor,
or write YAML:

```yaml
type: custom:imagenote-card
title: Boiler
image: /api/image/serve/3f2a9c…/original   # what the editor's upload produces
note: |
  **Last service:** 12 Oct 2025
  Next filter change in six months.
```

Note from an entity, editable on the card:

```yaml
type: custom:imagenote-card
title: Fridge
image: /local/pictures/fridge.jpg
note_entity: input_text.fridge_note
transition: fade
```

Wall-panel slideshow that turns over on its own:

```yaml
type: custom:imagenote-card
image: media-source://media_source/local/family/summer.jpg
note: See you on Sunday!
aspect_ratio: "4:3"
auto_flip: 20
show_hint: false
```

Pictures and notes in any order, up to ten. An entry with both a picture and a
note counts as two:

```yaml
type: custom:imagenote-card
title: Holiday
slides:
  - image: /local/pictures/arrival.jpg
    title: Arrival
  - note: "Day 1: **arrived** late, the hotel is fine."
  - note: "Day 2: hiking. Bring water."
  - image: /local/pictures/lake.jpg
    title: Lake
  - note_entity: input_text.holiday_shopping
    title: Shopping
auto_flip: 15
```

The same entries side by side as tiles; each tile turns between its own
picture and note:

```yaml
type: custom:imagenote-card
title: Garage
layout: grid
columns: 3
slides:
  - image: /local/pictures/bike.jpg
    title: Bike
    note: Chain oiled in March.
  - image: /local/pictures/car.jpg
    title: Car
    note: "Tyres: 2.5 bar front, 2.8 bar rear."
  - image: /local/pictures/tools.jpg
    title: Tools
    note_entity: input_text.garage_tools
```

Picture from an entity, note from an attribute:

```yaml
type: custom:imagenote-card
title: Front door
image_entity: camera.front_door
note_entity: sensor.last_visitor
note_attribute: message
transition: slide
direction: vertical
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `title` | – | Shown on the picture and above the note. |
| `image` | – | Picture URL, `/local/` path, `/api/image/serve/…` URL or `media-source://` id. Uploads from the editor land here. |
| `slides` | – | Pictures and notes in order, at most ten. Each entry is an object with `image` or `image_entity` (a picture), `note`, `note_entity` or `note_attribute` (a note), an optional `title`, or just a URL string. An entry with both picture and note becomes two slides. When set, the top-level picture and note fields are ignored. An entry without `title` uses the card title. `images` is accepted as an older name. |
| `layout` | `stack` | How several entries are shown: `stack` (one after another) or `grid` (tiles side by side, each turning between its own picture and note). |
| `columns` | `0` | With `layout: grid`: tiles per row. `0` fits as many as the width allows (about 150 px each). |
| `image_entity` | – | Use the picture of an `image`, `camera` or `person` entity, or an `input_text` / `text` entity whose state is a picture address (URL or `media-source://` id). |
| `markers` | – | Per picture: a list of `{ x, y, label, icon, entity }` pins. `x` and `y` are percent of the picture. See [Markers](#markers). |
| `ken_burns` | `false` | Slow zoom and pan on pictures. Off under "reduce motion". |
| `show_camera` | `true` | Camera button on pictures from an `input_text` / `text` entity. |
| `upload_max_size` | `1920` | Longest edge in pixels that uploaded and captured pictures are scaled down to. `0` keeps originals. |
| `image_fit` | `cover` | `cover` fills the card and crops, `contain` shows the whole picture. |
| `aspect_ratio` | `16:9` | `16:9`, `4:3`, `1:1`, `9:16`, any `w:h`, or `auto` for the picture's natural size. |
| `note` | – | The note text. Markdown is rendered. Ignored when `note_entity` is set. |
| `note_entity` | – | Read the note from an entity. `input_text` and `text` entities are editable on the card. |
| `note_attribute` | – | Read the note from this attribute of `note_entity` instead of its state (read-only). |
| `expires` | – | Per entry: `2026-10-01` or `2026-10-01 18:00`. Afterwards the page is dimmed and marked, or hidden (`expired_slides`). Until then the note shows "Until …". |
| `color` | – | Per note page: `yellow`, `green`, `blue`, `pink`, `orange`, `purple`, `grey` or any CSS colour. |
| `note_style` | `plain` | `plain` or `sticky`. Sticky notes get a paper tint and a folded corner. |
| `expired_slides` | `dim` | `dim` keeps expired pages greyed out with an "Expired" tag, `hide` removes them from the sequence. |
| `checklist` | `true` | Lines like `- [ ] item` become checkboxes on the card. |
| `checklist_writeback` | `true` | Ticks on notes from an `input_text` or `text` entity are saved to the entity. Ticks on other notes are remembered in the browser only. |
| `transition` | `flip` | `flip`, `fade`, `slide`, `cube` or `none`. |
| `direction` | `horizontal` | `horizontal` or `vertical`, for `flip`, `slide` and `cube`. |
| `duration` | `700` | Animation length in milliseconds. |
| `default_side` | `image` | Start on the first picture (`image`) or the first note (`note`). |
| `auto_flip` | `0` | Move to the next slide automatically every *n* seconds. `0` disables it. `auto_advance` is an older name for the same thing. |
| `show_navigation` | `true` | With more than two slides: show the arrows and dots. Swiping and the arrow keys always work. |
| `upload_target` | `image` | Where the editor's upload button stores files: `image` (Home Assistant's image store) or `media` (the media folder). |
| `upload_folder` | `imagenote` | With `upload_target: media`: the folder below `/media`. Created on the first upload. |
| `hover_flip` | `false` | Show the note while the pointer hovers over the card (mouse devices only). |
| `show_hint` | `true` | Show the small “Note” / “Photo” badge in the corner. |
| `show_title` | `true` | Show the title overlay on the picture. |
| `show_updated` | `true` | With `note_entity`: show when the note was last changed. |
| `tap_action` | `flip` | Action for a tap. See [Actions](#actions). |
| `hold_action` | `none` | Action for a long press. |
| `double_tap_action` | `none` | Action for a double tap. |

## Markers

Pins on a picture point at things and say what they are:

```yaml
type: custom:imagenote-card
title: Boiler room
image: /local/pictures/boiler.jpg
markers:
  - x: 30
    y: 45
    label: Stopcock
    icon: mdi:water-off
  - x: 72
    y: 30
    label: Pressure
    entity: sensor.boiler_pressure
  - x: 85
    y: 85
    entity: sensor.boiler_temp
```

A pin shows a number or its `icon`. A tap opens its label; with `entity` the
label also shows the state and a tap on the label opens the more-info dialog.
In the editor, click on the preview to add a pin, select a pin and click again
to move it, and fill in label, icon and entity in the list below.

## Taking photos on the card

Point `image_entity` at an `input_text` (or `text`) entity. The card shows
that entity's state as the picture address and adds a camera button. On a
phone the button opens the camera, elsewhere a file picker; the picture is
scaled down (`upload_max_size`), uploaded to the chosen `upload_target` and
its address is written into the entity with `set_value`. Automations can do
the same: any URL, `/local/` path or `media-source://` id works as a state.

```yaml
type: custom:imagenote-card
title: Damage report
image_entity: input_text.damage_photo
note_entity: input_text.damage_note
```

## Notes

Markdown is rendered by Home Assistant's own markdown element. On top of that:

- **Checklists.** `- [ ] Bread` and `- [x] Milk` become real checkboxes. When
  the note comes from an `input_text` or `text` entity the tick is written
  back, so every dashboard and automation sees it. For notes in the card
  config the tick is remembered in that browser.
- **Templates.** Anything with `{{ … }}` or `{% … %}` is rendered by Home
  Assistant and updates live:
  ```yaml
  note: "Boiler at **{{ states('sensor.boiler_temp') }} °C**, last error: {{ states('sensor.boiler_error') }}"
  ```
  Templated notes are read-only for checklists (the text changes under them).
- **Expiry.** `expires: 2026-10-01` shows "Until 1 Oct" in the footer and dims
  or hides the page afterwards. Good for "parcel at the neighbour's".
- **Colours and sticky notes.** `color: yellow` on an entry, or
  `note_style: sticky` on the card for the classic look.

## Actions

Tap, hold and double tap take the same action objects as Home Assistant's own
cards, plus `flip`:

| `action` | Effect |
| --- | --- |
| `flip` | Show the next slide. Default for `tap_action`. |
| `more-info` | Open the more-info dialog. `entity` defaults to `note_entity`, then `image_entity`. |
| `toggle` | Toggle `entity` (same default). |
| `navigate` | Go to `navigation_path`. |
| `url` | Open `url_path` in a new tab. |
| `perform-action` | Run `perform_action` with `data` and `target`. `call-service` / `service` still work. |
| `none` | Nothing. |

`confirmation: true` or `confirmation: { text: "…" }` asks before running an
action. A double tap is only detected when `double_tap_action` is set, so a
single tap stays instant otherwise.

```yaml
type: custom:imagenote-card
title: Fridge
image: /local/pictures/fridge.jpg
note_entity: input_text.fridge_note
hold_action:
  action: more-info
double_tap_action:
  action: perform-action
  perform_action: input_text.set_value
  target:
    entity_id: input_text.fridge_note
  data:
    value: ""
  confirmation:
    text: Clear the note?
```

## Styling

The card uses your theme. These CSS variables can be overridden with
[card-mod](https://github.com/thomasloven/lovelace-card-mod) or a theme:

| Variable | Purpose |
| --- | --- |
| `--imagenote-note-background` | Background of the note side. |
| `--imagenote-badge-background`, `--imagenote-badge-color` | The corner badge on the picture. |
| `--imagenote-placeholder-background` | Background when no picture is set. |
| `--imagenote-easing` | Timing function of the flip. |

## How pictures are stored

The editor's **Upload picture** button has two targets, chosen under *Where
uploads are stored*:

| Target | Where the file ends up | Notes |
| --- | --- | --- |
| **Home Assistant image store** (default) | `/config/image/<id>/original` | The same API that person and area pictures use. Served by id from `/api/image/serve/<id>/original`, so the file name never leaks into the dashboard. The location is fixed by Home Assistant. |
| **Media folder** | `/media/<folder>/<timestamp>-<name>` | A plain file you can see in the media browser, back up, and manage with Samba or the file editor. Uploading here needs an administrator account. The folder is configurable per card and created on demand. |

Any picture that already exists in `/config/www/` can be used with a `/local/`
path, and any file in `/media` with its `media-source://media_source/local/…`
id. Media-source ids are resolved through the media source API and renewed
before the signed URL expires.

## Sizing

In sections view the card fills the rows it is given (default 6 × 4, minimum
4 × 2) and scrolls a long note behind a soft fade above the footer. In masonry
view the card follows `aspect_ratio`. Below about 260 px width the badges
shrink to icons and paddings tighten; below 160 px height the "Updated" line
is hidden.

## Development

```bash
npm ci
npm run build        # bundles src/ into dist/imagenote-card.js
npm run typecheck    # tsc --noEmit
npm run verify       # sanity checks on the bundle
npm test             # Playwright smoke tests against the demo page (needs Chromium: npx playwright install chromium)
npm run demo         # http://localhost:8765/demo/ — local preview with stubbed HA elements
```

`dist/imagenote-card.js` is committed; CI fails when it does not match the
sources. The card is a plain custom element written in TypeScript, bundled with
esbuild, without a framework dependency.

## Ideas for later

- Several pictures per card (gallery on the front, one note per picture).
- Voice notes and drawings on the back.
- A small backend integration that keeps notes with the picture, with history.
- Actions on the note side (mark done, snooze, open a task).

## License

MIT
