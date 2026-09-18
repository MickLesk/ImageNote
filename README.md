<h1 align="center">ImageNote</h1>

<p align="center">
  A picture with a note on its back. Tap the card and it flips over.<br>
  A Home Assistant dashboard card, installable through HACS.
</p>

ImageNote pairs one picture with one note. The front shows the picture, the
back shows the note, and a tap (or a key press, a hover, or a timer) turns the
card over with a 3D flip, a crossfade, a slide or a cube rotation.

Typical uses: the fridge with the shopping list on its back, the boiler with the
last service date, a plant with its watering schedule, a family photo with a
message for the wall panel.

## Features

- **Upload a picture from the editor** — stored by Home Assistant, no `www`
  folder needed. URLs, `/local/` paths, `media-source://` ids and `image`,
  `camera` or `person` entities work too.
- **Notes in Markdown** — bold, lists, links.
- **Edit the note on the card** — link an `input_text` or `text` entity and a
  pencil appears on the note side. Changes are saved with `set_value`, so
  automations and other dashboards see them immediately.
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
| `image_entity` | – | Use the picture of an `image`, `camera` or `person` entity instead of `image`. |
| `image_fit` | `cover` | `cover` fills the card and crops, `contain` shows the whole picture. |
| `aspect_ratio` | `16:9` | `16:9`, `4:3`, `1:1`, `9:16`, any `w:h`, or `auto` for the picture's natural size. |
| `note` | – | The note text. Markdown is rendered. Ignored when `note_entity` is set. |
| `note_entity` | – | Read the note from an entity. `input_text` and `text` entities are editable on the card. |
| `note_attribute` | – | Read the note from this attribute of `note_entity` instead of its state (read-only). |
| `transition` | `flip` | `flip`, `fade`, `slide`, `cube` or `none`. |
| `direction` | `horizontal` | `horizontal` or `vertical`, for `flip`, `slide` and `cube`. |
| `duration` | `700` | Animation length in milliseconds. |
| `default_side` | `image` | Which side is shown first: `image` or `note`. |
| `auto_flip` | `0` | Turn the card over automatically every *n* seconds. `0` disables it. |
| `hover_flip` | `false` | Show the note while the pointer hovers over the card (mouse devices only). |
| `show_hint` | `true` | Show the small “Note” / “Photo” badge in the corner. |
| `show_title` | `true` | Show the title overlay on the picture. |
| `show_updated` | `true` | With `note_entity`: show when the note was last changed. |
| `tap_action` | `flip` | Action for a tap. See [Actions](#actions). |
| `hold_action` | `none` | Action for a long press. |
| `double_tap_action` | `none` | Action for a double tap. |

## Actions

Tap, hold and double tap take the same action objects as Home Assistant's own
cards, plus `flip`:

| `action` | Effect |
| --- | --- |
| `flip` | Turn the card over. Default for `tap_action`. |
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

The editor's **Upload picture** button sends the file to Home Assistant's own
image upload API (the same one used for person and area pictures). The file is
kept in `/config/image/` and served from `/api/image/serve/<id>/original`.
`media-source://` ids are resolved through the media source API and renewed
before the signed URL expires.

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
