# Styling and sizing

## Theme variables

The card uses your theme's colours. These CSS variables can be overridden with
[card-mod](https://github.com/thomasloven/lovelace-card-mod) or in a theme:

| Variable | Purpose |
| --- | --- |
| `--pinboard-note-background` | Background of note pages (overridden per page by `color`). |
| `--pinboard-note-text` | Text colour on tinted note pages. |
| `--pinboard-sticky-color` | Paper colour of `note_style: sticky`. |
| `--pinboard-badge-background`, `--pinboard-badge-color` | The corner badge on pictures. |
| `--pinboard-placeholder-background` | Background when no picture is set. |
| `--pinboard-radius` | Corner radius, defaults to `--ha-card-border-radius`. |
| `--pinboard-easing` | Timing function of the page turn. |
| `--pinboard-tile-gap` | Gap between tiles in `layout: grid`. |

Example with card-mod:

```yaml
type: custom:pinboard-card
image: /local/pictures/kids.jpg
note: Bedtime is at eight.
card_mod:
  style: |
    :host {
      --pinboard-note-background: #fff8e1;
      --pinboard-badge-background: rgba(255, 255, 255, 0.85);
      --pinboard-badge-color: #333;
    }
```

## Sections and masonry views

In sections view the card fills the rows it is given (default 6 columns by 4
rows, minimum 4 by 2) and scrolls a long note behind a soft fade above the
footer. `layout: grid` asks for 12 columns and 4 rows per row of tiles. In
masonry view and inside stacks the card follows `aspect_ratio`; `auto` uses
the picture's natural size.

## Small cards

Below about 260 px width the badges shrink to icons, paddings tighten and the
placeholder text is shortened. Below 160 px height the "Updated" line is
hidden. Arrows are hidden on note and audio pages at every size; tap, swipe,
dots and keys still work.

## Motion

With "reduce motion" enabled in the operating system every transition becomes
a short fade and `ken_burns` is switched off.
