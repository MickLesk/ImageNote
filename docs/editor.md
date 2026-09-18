# The editor and uploads

Pinboard has a visual editor for everything in the [options
table](../README.md#options). This page covers what the editor does beyond
filling in fields.

## Entries

*Pictures and notes* at the top lists the entries as chips: "1 · Picture",
"2 · Note", "3 · Picture + note". Add entries with *+ Picture*, *+ Note* and
*+ Audio*; an entry may carry several parts and then counts as several pages.
The card holds at most ten pages.

Reorder by dragging a chip onto another one, or with *Move left* / *Move
right* on touch screens. *Remove* deletes the selected entry. With a single
entry the editor writes the flat form (`image`, `note` … on the card); with
several it writes `slides`.

## Uploading pictures

*Upload picture* stores a file and fills in its address. Pictures are scaled
down to `upload_max_size` (1920 px by default) and optionally centre-cropped
to the card's aspect ratio (`upload_crop`) before they leave the browser.
Where the file ends up is chosen under *Where uploads are stored*:

| Target | Where the file ends up | Notes |
| --- | --- | --- |
| **Home Assistant image store** (default) | `/config/image/<id>/original` | The same API person and area pictures use. Served by id from `/api/image/serve/<id>/original`, so the file name never appears in the dashboard. The location is fixed by Home Assistant. |
| **Media folder** | `/media/<folder>/<timestamp>-<name>` | A plain file you can see in the media browser, back up, and manage with Samba or the file editor. Uploading here needs an administrator account. The folder is set per card (`upload_folder`) and created on demand. |

The camera and record buttons on the card use the same settings. Audio always
goes to the media folder, because the image store only takes pictures.

Any picture that already exists in `/config/www/` can be used with a `/local/`
path, and any file in `/media` with its `media-source://media_source/local/…`
id.

## Importing a folder

*Import from a media folder* adds every picture of a folder below `/media` as
an entry, up to the limit of ten. Enter the folder name (or a full
`media-source://` id) and press *Import*.

## Markers

Below the picture preview, *Markers on the picture* shows the picture once
more. Click on it to add a pin, click a pin (in the picture or in the list) to
select it, and click again on the picture to move the selected pin. Each row
in the list has fields for label, icon and entity and a remove button.

## Audio

For an audio entry the editor shows *Record* and *Upload audio file*.
*Record* asks for the microphone and records until *Stop*, then uploads the
memo to the media folder and fills in the address; a player below lets you
listen to the result. *Upload audio file* takes an existing file. The
*Audio URL* field accepts URLs and `media-source://` ids, *Audio entity*
points at an `input_text` / `text` entity that holds the address.

## Preview

The card at the bottom follows the current settings. *Play animation* turns
it to the next page so the transitions can be compared without saving.
