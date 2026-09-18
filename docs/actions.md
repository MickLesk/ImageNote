# Actions

Tap, hold and double tap take the same action objects as Home Assistant's own
cards, plus `flip`. A tap turns to the next page unless you say otherwise.

| `action` | Effect |
| --- | --- |
| `flip` | Show the next page. Default for `tap_action`. |
| `more-info` | Open the more-info dialog. `entity` defaults to the page's `note_entity`, then `image_entity`. |
| `toggle` | Toggle `entity` (same default). |
| `navigate` | Go to `navigation_path`. `navigation_replace: true` replaces the history entry. |
| `url` | Open `url_path` in a new tab. |
| `perform-action` | Run `perform_action` with `data` and `target`. `call-service` with `service` still works. |
| `none` | Nothing. |

`confirmation: true` or `confirmation: { text: "…" }` asks before running an
action. A double tap is only detected when `double_tap_action` is set, so a
single tap stays instant otherwise. Hold fires after half a second; a swipe
never triggers an action.

Buttons on the card (edit, play, camera, record, markers, checkboxes, links)
never turn the page.

## Examples

Long press opens the note entity, double tap clears the note after asking:

```yaml
type: custom:pinboard-card
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

A tap opens a dashboard instead of turning, the pages are turned by swiping:

```yaml
type: custom:pinboard-card
image: /local/pictures/heating.jpg
note: Boiler room, ground floor.
tap_action:
  action: navigate
  navigation_path: /dashboard-heating
```

## Events

Every page turn dispatches a `pinboard-slide` DOM event (bubbling, composed)
with `{ index, kind }` in `detail`. The element also exposes `flip()`,
`flip("note")`, `goTo(index)`, `goTo("next")` and `goTo("prev")` for scripts
and other cards.
