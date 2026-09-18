# Pages and content

A Pinboard card is a sequence of up to ten pages. A page is a picture, a note
or a recording. The simplest card has two pages, a picture and the note on
its back; a tap turns to the next page and wraps around at the end.

## Pictures

```yaml
type: custom:pinboard-card
title: Boiler
image: /local/pictures/boiler.jpg
```

`image` accepts a URL, a `/local/` path (files in `/config/www/`), the
`/api/image/serve/<id>/original` address the editor's upload produces, or a
`media-source://media_source/local/…` id for files in `/media`. Media-source
ids are resolved through the media source API and renewed before the signed
URL expires.

`image_entity` takes the picture from an entity instead:

- `image.*` and `camera.*` entities show their latest frame and refresh when
  the entity updates.
- `person.*` entities show their profile picture.
- `input_text.*` and `text.*` entities are read as a picture address. This
  enables the [camera button](#taking-photos-on-the-card).

`aspect_ratio` and `image_fit` control the frame; `ken_burns: true` adds a
slow zoom and pan for wall panels.

## Notes

```yaml
type: custom:pinboard-card
title: Fridge
image: /local/pictures/fridge.jpg
note: |
  **Milk** is running low.
  Buy 2 litres on Friday.
```

Notes are Markdown, rendered by Home Assistant's own markdown element:
bold, lists, links, headings.

### Notes from entities

`note_entity` reads the note from an entity's state. With an `input_text` or
`text` entity a pencil appears on the note page and the note can be edited on
the card; the change is saved with `set_value`, so every dashboard and
automation sees it. `note_attribute` reads an attribute instead of the state
and is read-only.

```yaml
type: custom:pinboard-card
title: Front door
image_entity: camera.front_door
note_entity: sensor.last_visitor
note_attribute: message
```

The footer shows when the note was last changed (`show_updated`).

### Checklists

Lines like `- [ ] Bread` and `- [x] Milk` become checkboxes. When the note
comes from an `input_text` or `text` entity the tick is written back to the
entity (`checklist_writeback`). For notes in the card configuration the tick
is remembered in that browser. Set `checklist: false` to render them as plain
Markdown.

### Templates

Anything with `{{ … }}` or `{% … %}` is rendered by Home Assistant and updates
live:

```yaml
note: "Boiler at **{{ states('sensor.boiler_temp') }} °C**, last error: {{ states('sensor.boiler_error') }}"
```

Templated notes do not write checklist ticks back, because the text changes
under them.

### Expiry

`expires` gives a page a shelf life. Until then the footer shows "Until 1
Oct"; afterwards the page is dimmed and tagged "Expired", or removed from the
sequence with `expired_slides: hide`. A bare date expires at the end of that
day, local time.

```yaml
slides:
  - note: Parcel at the neighbour's.
    expires: "2026-10-01"
```

### Colours and sticky notes

`color` tints a note page: `yellow`, `green`, `blue`, `pink`, `orange`,
`purple`, `grey` or any CSS colour. Text switches to light or dark to stay
readable. `note_style: sticky` on the card gives all notes a paper tint and a
folded corner.

## Markers

Pins on a picture point at things and say what they are:

```yaml
type: custom:pinboard-card
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
scaled down (`upload_max_size`), optionally cropped (`upload_crop`), uploaded
to the chosen `upload_target` and its address is written into the entity with
`set_value`. Automations can do the same: any URL, `/local/` path or
`media-source://` id works as a state. `show_camera: false` hides the button.

```yaml
type: custom:pinboard-card
title: Damage report
image_entity: input_text.damage_photo
note_entity: input_text.damage_note
```

## Voice memos

An audio page shows a player with a big play button, a progress bar you can
tap to seek, and the title. Three ways to fill it:

- **Record in the editor.** *+ Audio*, then *Record*. The browser asks for
  the microphone; *Stop* uploads the memo to the media folder
  (`upload_folder`) and fills in the address. Recording works in Chrome,
  Firefox and Safari 14.5 or newer.
- **Upload an audio file** or paste a URL / `media-source://` id into
  `audio`.
- **Record on the card.** Point `audio_entity` at an `input_text`. The page
  gets a microphone button; a tap records (up to three minutes), a second tap
  stops, uploads and writes the address into the entity. Requires an
  administrator account for the media upload. `show_record: false` hides the
  button.

```yaml
type: custom:pinboard-card
title: Message for Dad
slides:
  - image: /local/pictures/kids.jpg
  - audio_entity: input_text.kids_memo
```

## Several pages

`slides` lists pages in any order. An entry with several parts (picture, note,
audio) becomes one page per part, in that order.

```yaml
type: custom:pinboard-card
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

Tap, swipe, the arrows, the dots and the arrow keys move between pages;
`auto_flip` runs a slideshow. Touches that start on a card with more than one
page stay inside the card, so dashboards with swipe navigation (for example
the "swipe-navigation" HACS plugin) do not switch views when you swipe over
it. `swipe: false` hands those swipes back to the dashboard. With more than two pages, arrows and dots appear
on pictures (`show_navigation`). On note pages the arrows stay hidden so they
never sit on the text.

## Tiles

`layout: grid` shows the entries side by side inside one card. Every tile is
a complete card of its own that turns between its picture, note and audio.
`columns` fixes the tiles per row; `0` fits as many as the width allows.

```yaml
type: custom:pinboard-card
title: Garden
layout: grid
columns: 2
slides:
  - image: /local/pictures/tomatoes.jpg
    title: Tomatoes
    note: Water every second day.
  - image: /local/pictures/lawn.jpg
    title: Lawn
    note_entity: input_text.lawn_note
```
