/*! ImageNote Card v0.1.0 | MIT | https://github.com/MickLesk/ImageNote */

// src/const.ts
var CARD_TYPE = "imagenote-card";
var EDITOR_TYPE = "imagenote-card-editor";
var CARD_NAME = "ImageNote Card";
var CARD_DESCRIPTION = "A picture with a note on its back. Tap to flip between them.";
var DOCUMENTATION_URL = "https://github.com/MickLesk/ImageNote";
var VERSION = "0.1.0";
var TRANSITIONS = ["flip", "fade", "slide", "cube", "none"];
var DIRECTIONS = ["horizontal", "vertical"];
var SIDES = ["image", "note"];
var IMAGE_FITS = ["cover", "contain"];
var LAYOUTS = ["stack", "grid"];
var TILE_MIN_WIDTH_PX = 150;
var MAX_SLIDES = 10;
var ASPECT_RATIOS = ["16:9", "4:3", "3:2", "1:1", "3:4", "9:16", "auto"];
var NOTE_ENTITY_DOMAINS = ["input_text", "text"];
var MEDIA_SOURCE_PREFIX = "media-source://";
var MEDIA_EXPIRES_SECONDS = 24 * 60 * 60;
var MEDIA_REFRESH_MS = (MEDIA_EXPIRES_SECONDS - 10 * 60) * 1e3;
var FLIP_ACTION = { action: "flip" };
var NONE_ACTION = { action: "none" };
var HOLD_DELAY_MS = 500;
var DOUBLE_TAP_WINDOW_MS = 250;
var SWIPE_THRESHOLD_PX = 40;
var DEFAULTS = {
  title: "",
  layout: "stack",
  columns: 0,
  image_fit: "cover",
  aspect_ratio: "16:9",
  transition: "flip",
  direction: "horizontal",
  default_side: "image",
  duration: 700,
  auto_flip: 0,
  auto_advance: 0,
  hover_flip: false,
  show_hint: true,
  show_title: true,
  show_updated: true,
  show_navigation: true,
  tap_action: FLIP_ACTION,
  hold_action: NONE_ACTION,
  double_tap_action: NONE_ACTION
};
var SAMPLE_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c5364"/><stop offset=".5" stop-color="#203a43"/><stop offset="1" stop-color="#0f2027"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="500" cy="90" r="46" fill="#ffd166" opacity=".9"/><path d="M0 300 L120 210 L210 270 L330 170 L430 250 L520 200 L640 280 L640 360 L0 360 Z" fill="#06d6a0" opacity=".75"/><path d="M0 330 L90 280 L180 320 L300 250 L420 310 L560 260 L640 320 L640 360 L0 360 Z" fill="#118ab2" opacity=".85"/></svg>`
);

// src/actions.ts
function fireEvent(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}
function confirmAction(config, fallback) {
  if (!config.confirmation) return true;
  const text = typeof config.confirmation === "object" && config.confirmation.text ? config.confirmation.text : fallback;
  return window.confirm(text);
}
async function runAction(node, hass, card, config, confirmText) {
  const defaultEntity = card.note_entity || card.image_entity || void 0;
  switch (config.action) {
    case "flip":
      return true;
    case "none":
    case void 0:
      return false;
    case "more-info": {
      const entityId = config.entity ?? defaultEntity;
      if (entityId) fireEvent(node, "hass-more-info", { entityId });
      return false;
    }
    case "navigate": {
      if (!config.navigation_path) return false;
      if (!confirmAction(config, confirmText)) return false;
      if (config.navigation_replace) {
        window.history.replaceState(null, "", config.navigation_path);
      } else {
        window.history.pushState(null, "", config.navigation_path);
      }
      fireEvent(node, "location-changed", { replace: Boolean(config.navigation_replace) });
      return false;
    }
    case "url": {
      if (!config.url_path) return false;
      if (!confirmAction(config, confirmText)) return false;
      window.open(config.url_path, "_blank", "noopener");
      return false;
    }
    case "toggle": {
      const entityId = config.entity ?? defaultEntity;
      if (!entityId || !hass) return false;
      if (!confirmAction(config, confirmText)) return false;
      await hass.callService("homeassistant", "toggle", { entity_id: entityId });
      return false;
    }
    case "perform-action":
    case "call-service": {
      const service = config.perform_action ?? config.service;
      if (!service || !hass) return false;
      const [domain, name] = service.split(".", 2);
      if (!domain || !name) return false;
      if (!confirmAction(config, confirmText)) return false;
      const data = { ...config.service_data ?? config.data ?? {} };
      if (config.target) {
        Object.assign(data, config.target);
      }
      await hass.callService(domain, name, data);
      return false;
    }
    default:
      return false;
  }
}
var GestureDetector = class {
  constructor(_target, _onAction, _options) {
    this._target = _target;
    this._onAction = _onAction;
    this._options = _options;
    _target.addEventListener("pointerdown", this._onPointerDown);
    _target.addEventListener("pointerup", this._onPointerUp);
    _target.addEventListener("pointercancel", this._onPointerCancel);
    _target.addEventListener("pointermove", this._onPointerMove);
    _target.addEventListener("contextmenu", this._onContextMenu);
  }
  _target;
  _onAction;
  _options;
  _holdTimer;
  _tapTimer;
  _held = false;
  _startX = 0;
  _startY = 0;
  _cancelled = false;
  _tracking = false;
  _swiped = false;
  destroy() {
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._tapTimer);
    this._target.removeEventListener("pointerdown", this._onPointerDown);
    this._target.removeEventListener("pointerup", this._onPointerUp);
    this._target.removeEventListener("pointercancel", this._onPointerCancel);
    this._target.removeEventListener("pointermove", this._onPointerMove);
    this._target.removeEventListener("contextmenu", this._onContextMenu);
  }
  _onPointerDown = (ev) => {
    if (!this._options.enabled(ev) || ev.button !== 0) return;
    this._cancelled = false;
    this._held = false;
    this._tracking = true;
    this._swiped = false;
    this._startX = ev.clientX;
    this._startY = ev.clientY;
    window.clearTimeout(this._holdTimer);
    this._holdTimer = window.setTimeout(() => {
      this._held = true;
      this._onAction("hold");
    }, this._options.holdDelay);
  };
  _onPointerMove = (ev) => {
    if (!this._tracking || this._swiped) return;
    const dx = ev.clientX - this._startX;
    const dy = ev.clientY - this._startY;
    if (Math.abs(dx) >= this._options.swipeThreshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      this._swiped = true;
      this._cancel();
      this._options.onSwipe?.(dx < 0 ? "left" : "right");
      return;
    }
    if (this._holdTimer !== void 0 && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      this._cancel();
    }
  };
  _onPointerCancel = () => {
    this._cancel();
    this._tracking = false;
  };
  _onContextMenu = (ev) => {
    if (this._holdTimer !== void 0 || this._held) ev.preventDefault();
  };
  _onPointerUp = (ev) => {
    if (!this._tracking || ev.button !== 0) return;
    this._tracking = false;
    window.clearTimeout(this._holdTimer);
    this._holdTimer = void 0;
    if (this._cancelled || this._held) {
      this._held = false;
      return;
    }
    if (!this._options.hasDoubleTap()) {
      this._onAction("tap");
      return;
    }
    if (this._tapTimer !== void 0) {
      window.clearTimeout(this._tapTimer);
      this._tapTimer = void 0;
      this._onAction("double_tap");
      return;
    }
    this._tapTimer = window.setTimeout(() => {
      this._tapTimer = void 0;
      this._onAction("tap");
    }, this._options.doubleTapWindow);
  };
  _cancel() {
    window.clearTimeout(this._holdTimer);
    this._holdTimer = void 0;
    this._cancelled = true;
  }
};

// src/config.ts
function pick(value, allowed, fallback) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}
function str(value, fallback = "") {
  if (value === void 0 || value === null) return fallback;
  return String(value);
}
function num(value, fallback, min = 0, max = Number.POSITIVE_INFINITY) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function bool(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}
function action(value, fallback) {
  if (typeof value === "string") return { action: value };
  if (value && typeof value === "object" && typeof value.action === "string") {
    return value;
  }
  return fallback;
}
function validateConfig(config) {
  if (!config || typeof config !== "object") {
    throw new Error("ImageNote: configuration must be an object");
  }
  const c = config;
  if (c.transition !== void 0 && !TRANSITIONS.includes(c.transition)) {
    throw new Error(`ImageNote: unknown transition "${String(c.transition)}" (use ${TRANSITIONS.join(", ")})`);
  }
  if (c.direction !== void 0 && !DIRECTIONS.includes(c.direction)) {
    throw new Error(`ImageNote: unknown direction "${String(c.direction)}" (use ${DIRECTIONS.join(", ")})`);
  }
  if (c.default_side !== void 0 && !SIDES.includes(c.default_side)) {
    throw new Error(`ImageNote: unknown default_side "${String(c.default_side)}" (use ${SIDES.join(", ")})`);
  }
  validatePage(c, "");
  for (const key of ["slides", "images"]) {
    const list = c[key];
    if (list === void 0) continue;
    if (!Array.isArray(list)) {
      throw new Error(`ImageNote: ${key} must be a list`);
    }
    list.forEach((entry, index) => {
      if (typeof entry === "string") return;
      if (!entry || typeof entry !== "object") {
        throw new Error(`ImageNote: ${key}[${index}] must be a URL or an object`);
      }
      validatePage(entry, `${key}[${index}].`);
    });
  }
  const total = expandSlides(configPages(config).map(normalizePage)).length;
  if (total > MAX_SLIDES) {
    throw new Error(`ImageNote: at most ${MAX_SLIDES} slides per card (this card has ${total})`);
  }
}
function validatePage(c, prefix) {
  if (c.note_entity !== void 0 && c.note_entity !== "" && typeof c.note_entity !== "string") {
    throw new Error(`ImageNote: ${prefix}note_entity must be an entity id`);
  }
  if (c.image_entity !== void 0 && c.image_entity !== "" && typeof c.image_entity !== "string") {
    throw new Error(`ImageNote: ${prefix}image_entity must be an entity id`);
  }
  if (c.image !== void 0 && c.image !== null && typeof c.image !== "string" && !(typeof c.image === "object" && typeof c.image.media_content_id === "string")) {
    throw new Error(`ImageNote: ${prefix}image must be a URL, a media-source id or a media object`);
  }
}
function normalizePage(page) {
  return {
    kind: page.kind === "note" || page.kind === "image" ? page.kind : void 0,
    title: str(page.title).trim(),
    image: page.image === null || page.image === "" ? void 0 : page.image,
    image_entity: str(page.image_entity).trim(),
    note: str(page.note),
    note_entity: str(page.note_entity).trim(),
    note_attribute: str(page.note_attribute).trim()
  };
}
function configPages(config) {
  const list = Array.isArray(config.slides) && config.slides.length > 0 ? config.slides : config.images;
  if (Array.isArray(list) && list.length > 0) {
    return list.map((entry) => typeof entry === "string" ? { image: entry } : entry);
  }
  return [
    {
      image: config.image,
      image_entity: config.image_entity,
      note: config.note,
      note_entity: config.note_entity,
      note_attribute: config.note_attribute
    }
  ];
}
function hasPicture(page) {
  return Boolean(page.image) || Boolean(page.image_entity);
}
function hasNote(page) {
  return Boolean(page.note) || Boolean(page.note_entity);
}
function expandSlides(entries) {
  const slides = [];
  entries.forEach((entry, index) => {
    const picture = hasPicture(entry) || entry.kind === "image";
    const note = hasNote(entry) || entry.kind === "note";
    if (picture || !note) {
      slides.push({ ...entry, kind: "image", entry: index, note: "", note_entity: "", note_attribute: "" });
    }
    if (note) {
      slides.push({ ...entry, kind: "note", entry: index, image: void 0, image_entity: "" });
    }
  });
  return slides;
}
function normalizeConfig(config) {
  const entries = configPages(config).map(normalizePage);
  return {
    type: config.type,
    title: str(config.title).trim(),
    entries,
    slides: expandSlides(entries),
    layout: pick(config.layout, LAYOUTS, DEFAULTS.layout),
    columns: Math.round(num(config.columns, DEFAULTS.columns, 0, 8)),
    image_fit: pick(config.image_fit, IMAGE_FITS, DEFAULTS.image_fit),
    aspect_ratio: str(config.aspect_ratio, DEFAULTS.aspect_ratio).trim() || DEFAULTS.aspect_ratio,
    transition: pick(config.transition, TRANSITIONS, DEFAULTS.transition),
    direction: pick(config.direction, DIRECTIONS, DEFAULTS.direction),
    default_side: pick(config.default_side, SIDES, DEFAULTS.default_side),
    duration: num(config.duration, DEFAULTS.duration, 0, 1e4),
    auto_flip: num(config.auto_flip, DEFAULTS.auto_flip, 0, 86400),
    // auto_advance is the older name; both advance to the next slide.
    auto_advance: num(config.auto_advance, DEFAULTS.auto_advance, 0, 86400),
    hover_flip: bool(config.hover_flip, DEFAULTS.hover_flip),
    show_hint: bool(config.show_hint, DEFAULTS.show_hint),
    show_title: bool(config.show_title, DEFAULTS.show_title),
    show_updated: bool(config.show_updated, DEFAULTS.show_updated),
    show_navigation: bool(config.show_navigation, DEFAULTS.show_navigation),
    tap_action: action(config.tap_action, DEFAULTS.tap_action),
    hold_action: action(config.hold_action, DEFAULTS.hold_action),
    double_tap_action: action(config.double_tap_action, DEFAULTS.double_tap_action)
  };
}
function parseAspectRatio(value) {
  const text = value.trim().toLowerCase();
  if (!text || text === "auto") return null;
  const parts = text.split(/[:/x]/).map((p) => Number(p.trim()));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    return parts[0] / parts[1];
  }
  const single = Number(text);
  return Number.isFinite(single) && single > 0 ? single : null;
}

// src/i18n.ts
var en = {
  note: "Note",
  photo: "Photo",
  tapToFlip: "Tap to flip",
  showNote: "Show note",
  showPhoto: "Show photo",
  editNote: "Edit note",
  save: "Save",
  cancel: "Cancel",
  saving: "Saving…",
  saveFailed: "Saving failed",
  noImage: "No picture yet",
  noImageHelp: "Open the card editor to upload or pick a picture.",
  noNote: "No note yet",
  noNoteHelp: "Add a note in the card editor or link a text entity.",
  entityMissing: "Entity {entity} not found",
  imageError: "The picture could not be loaded",
  charsLeft: "{count} characters left",
  updated: "Updated {time}",
  page: "Picture {index} of {total}",
  slide: "Slide {index} of {total}",
  nextPicture: "Next picture",
  previousPicture: "Previous picture",
  confirm: "Are you sure?",
  editor_title: "Title",
  editor_title_help: "Shown on the picture and above the note. Optional.",
  editor_image: "Picture URL",
  editor_image_help: "Upload a picture or enter a URL, a /local/ path or a media-source id.",
  editor_image_entity: "Picture entity (optional)",
  editor_image_entity_help: "Use the picture of an image, camera or person entity instead of a static picture.",
  editor_note_source: "Note from an entity",
  editor_upload: "Upload picture",
  editor_clear: "Remove",
  editor_uploading: "Uploading…",
  editor_upload_done: "Uploaded. The picture is stored by Home Assistant.",
  editor_upload_failed: "Upload failed",
  editor_upload_too_large: "The file is too large",
  editor_note: "Note",
  editor_note_help: "Markdown is supported. Ignored when a note entity is set.",
  editor_note_entity: "Note entity (optional)",
  editor_note_entity_help: "Read and edit the note from an input_text or text entity. The note can then be changed on the card itself.",
  editor_note_attribute: "Note attribute (optional)",
  editor_note_attribute_help: "Read the note from an attribute instead of the entity state.",
  editor_appearance: "Appearance",
  editor_behaviour: "Behaviour",
  editor_transition: "Animation",
  editor_direction: "Direction",
  editor_default_side: "Start with",
  editor_aspect_ratio: "Aspect ratio",
  editor_image_fit: "Picture fit",
  editor_duration: "Animation duration",
  editor_auto_flip: "Auto flip every",
  editor_auto_flip_help: "0 disables automatic flipping.",
  editor_hover_flip: "Flip on hover (desktop)",
  editor_show_updated: "Show when the note was last changed",
  editor_show_navigation: "Show arrows and dots for several pictures",
  editor_layout: "Several pictures",
  layout_stack: "One after another (tap / swipe)",
  layout_grid: "Side by side as tiles",
  editor_columns: "Tiles per row",
  editor_columns_help: "0 fits as many tiles as the width allows.",
  editor_auto_advance: "Next picture every",
  editor_auto_advance_help: "0 disables the slideshow.",
  editor_pages: "Pictures and notes",
  editor_pages_help: "Up to 10 in any order. A tap on the card shows the next one; swiping and the arrows work too. A picture with a note counts as two.",
  editor_add_page: "Picture",
  editor_add_note: "Note",
  editor_remove_page: "Remove",
  editor_page_label: "Picture {index}",
  editor_kind_image: "Picture",
  editor_kind_note: "Note",
  editor_kind_both: "Picture + note",
  editor_max_slides: "The card holds at most 10 pictures and notes.",
  editor_page_title: "Title for this picture (optional)",
  editor_page_title_help: "Falls back to the card title.",
  editor_move_left: "Move left",
  editor_move_right: "Move right",
  editor_upload_settings: "Where uploads are stored",
  editor_upload_target: "Storage",
  editor_upload_target_help: "Home Assistant's image storage keeps files in /config/image and serves them by id. The media folder keeps them as normal files under /media, visible in the media browser and in backups.",
  editor_upload_folder: "Folder in /media",
  editor_upload_folder_help: "Created on the first upload. Leave empty for the top level.",
  upload_target_image: "Home Assistant image storage (/config/image)",
  upload_target_media: "Media folder (/media/…)",
  editor_upload_forbidden: "Only administrators can upload to the media folder",
  editor_hold_action: "Hold action",
  editor_double_tap_action: "Double tap action",
  editor_actions_help: "Tapping flips the card. Hold and double tap can open more info, navigate, open a URL, toggle an entity or perform an action.",
  editor_show_hint: "Show flip hint",
  editor_show_title: "Show title",
  transition_flip: "3D flip",
  transition_fade: "Crossfade",
  transition_slide: "Slide",
  transition_cube: "Cube",
  transition_none: "None",
  direction_horizontal: "Horizontal",
  direction_vertical: "Vertical",
  side_image: "Picture",
  side_note: "Note",
  fit_cover: "Fill (crop)",
  fit_contain: "Fit (letterbox)",
  ratio_auto: "Natural picture size"
};
var de = {
  note: "Notiz",
  photo: "Foto",
  tapToFlip: "Tippen zum Umdrehen",
  showNote: "Notiz anzeigen",
  showPhoto: "Foto anzeigen",
  editNote: "Notiz bearbeiten",
  save: "Speichern",
  cancel: "Abbrechen",
  saving: "Speichern…",
  saveFailed: "Speichern fehlgeschlagen",
  noImage: "Noch kein Bild",
  noImageHelp: "Öffne den Karteneditor, um ein Bild hochzuladen oder auszuwählen.",
  noNote: "Noch keine Notiz",
  noNoteHelp: "Füge im Karteneditor eine Notiz hinzu oder verknüpfe eine Text-Entität.",
  entityMissing: "Entität {entity} nicht gefunden",
  imageError: "Das Bild konnte nicht geladen werden",
  charsLeft: "{count} Zeichen übrig",
  updated: "Geändert {time}",
  page: "Bild {index} von {total}",
  slide: "Seite {index} von {total}",
  nextPicture: "Nächstes Bild",
  previousPicture: "Vorheriges Bild",
  confirm: "Bist du sicher?",
  editor_title: "Titel",
  editor_title_help: "Wird auf dem Bild und über der Notiz angezeigt. Optional.",
  editor_image: "Bild-URL",
  editor_image_help: "Bild hochladen oder eine URL, einen /local/-Pfad oder eine media-source-ID eingeben.",
  editor_image_entity: "Bild-Entität (optional)",
  editor_image_entity_help: "Bild einer image-, camera- oder person-Entität statt eines festen Bildes verwenden.",
  editor_note_source: "Notiz aus einer Entität",
  editor_upload: "Bild hochladen",
  editor_clear: "Entfernen",
  editor_uploading: "Wird hochgeladen…",
  editor_upload_done: "Hochgeladen. Home Assistant speichert das Bild.",
  editor_upload_failed: "Upload fehlgeschlagen",
  editor_upload_too_large: "Die Datei ist zu groß",
  editor_note: "Notiz",
  editor_note_help: "Markdown wird unterstützt. Wird ignoriert, wenn eine Notiz-Entität gesetzt ist.",
  editor_note_entity: "Notiz-Entität (optional)",
  editor_note_entity_help: "Notiz aus einer input_text- oder text-Entität lesen und bearbeiten. Die Notiz lässt sich dann direkt auf der Karte ändern.",
  editor_note_attribute: "Notiz-Attribut (optional)",
  editor_note_attribute_help: "Notiz aus einem Attribut statt aus dem Zustand der Entität lesen.",
  editor_appearance: "Darstellung",
  editor_behaviour: "Verhalten",
  editor_transition: "Animation",
  editor_direction: "Richtung",
  editor_default_side: "Startseite",
  editor_aspect_ratio: "Seitenverhältnis",
  editor_image_fit: "Bildanpassung",
  editor_duration: "Animationsdauer",
  editor_auto_flip: "Automatisch umdrehen alle",
  editor_auto_flip_help: "0 deaktiviert das automatische Umdrehen.",
  editor_hover_flip: "Beim Überfahren umdrehen (Desktop)",
  editor_show_updated: "Anzeigen, wann die Notiz zuletzt geändert wurde",
  editor_show_navigation: "Pfeile und Punkte bei mehreren Bildern anzeigen",
  editor_layout: "Mehrere Bilder",
  layout_stack: "Nacheinander (tippen / wischen)",
  layout_grid: "Nebeneinander als Kacheln",
  editor_columns: "Kacheln pro Zeile",
  editor_columns_help: "0 nimmt so viele Kacheln nebeneinander, wie die Breite erlaubt.",
  editor_auto_advance: "Nächstes Bild alle",
  editor_auto_advance_help: "0 deaktiviert die Diashow.",
  editor_pages: "Bilder und Notizen",
  editor_pages_help: "Bis zu 10 in beliebiger Reihenfolge. Ein Tipp auf die Karte zeigt die nächste Seite, Wischen und Pfeile gehen auch. Ein Bild mit Notiz zählt als zwei.",
  editor_add_page: "Bild",
  editor_add_note: "Notiz",
  editor_remove_page: "Entfernen",
  editor_page_label: "Bild {index}",
  editor_kind_image: "Bild",
  editor_kind_note: "Notiz",
  editor_kind_both: "Bild + Notiz",
  editor_max_slides: "Die Karte fasst höchstens 10 Bilder und Notizen.",
  editor_page_title: "Titel für dieses Bild (optional)",
  editor_page_title_help: "Sonst gilt der Kartentitel.",
  editor_move_left: "Nach links",
  editor_move_right: "Nach rechts",
  editor_upload_settings: "Speicherort für Uploads",
  editor_upload_target: "Speicher",
  editor_upload_target_help: "Der Bildspeicher von Home Assistant legt Dateien unter /config/image ab und liefert sie per ID aus. Der Medienordner speichert sie als normale Dateien unter /media, sichtbar im Medienbrowser und in Backups.",
  editor_upload_folder: "Ordner in /media",
  editor_upload_folder_help: "Wird beim ersten Upload angelegt. Leer lassen für die oberste Ebene.",
  upload_target_image: "Bildspeicher von Home Assistant (/config/image)",
  upload_target_media: "Medienordner (/media/…)",
  editor_upload_forbidden: "Nur Administratoren können in den Medienordner hochladen",
  editor_hold_action: "Aktion bei langem Drücken",
  editor_double_tap_action: "Aktion bei Doppeltipp",
  editor_actions_help: "Tippen dreht die Karte um. Langes Drücken und Doppeltipp können „Mehr Infos“ öffnen, navigieren, eine URL öffnen, eine Entität umschalten oder eine Aktion ausführen.",
  editor_show_hint: "Hinweis zum Umdrehen anzeigen",
  editor_show_title: "Titel anzeigen",
  transition_flip: "3D-Flip",
  transition_fade: "Überblenden",
  transition_slide: "Schieben",
  transition_cube: "Würfel",
  transition_none: "Keine",
  direction_horizontal: "Horizontal",
  direction_vertical: "Vertikal",
  side_image: "Bild",
  side_note: "Notiz",
  fit_cover: "Füllen (zuschneiden)",
  fit_contain: "Einpassen (Ränder)",
  ratio_auto: "Natürliche Bildgröße"
};
var LOCALES = { en, de };
function resolveLanguage(hass) {
  const raw = hass?.locale?.language || hass?.language || navigator.language || "en";
  const short = raw.toLowerCase().split(/[-_]/)[0];
  return short in LOCALES ? short : "en";
}
function translate(language, key, vars) {
  const table = LOCALES[language] ?? en;
  let text = table[key] ?? en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }
  return text;
}

// src/styles.ts
var CARD_STYLES = `
:host {
  display: block;
  height: 100%;
  --imagenote-duration: 700ms;
  --imagenote-easing: cubic-bezier(0.4, 0.05, 0.2, 1);
  --imagenote-radius: var(--ha-card-border-radius, 12px);
  --imagenote-note-background: var(--ha-card-background, var(--card-background-color, #fff));
  --imagenote-badge-background: rgba(0, 0, 0, 0.55);
  --imagenote-badge-color: #fff;
  --imagenote-placeholder-background: var(--secondary-background-color, #f2f2f2);
}

ha-card {
  position: relative;
  overflow: hidden;
  height: 100%;
  box-sizing: border-box;
  border-radius: var(--imagenote-radius);
}

.hidden {
  display: none !important;
}

/* ---------- stage & scene ---------- */
.stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 96px;
  perspective: 1400px;
  overflow: hidden;
  border-radius: var(--imagenote-radius);
  outline: none;
}
.stage.ratio {
  aspect-ratio: var(--imagenote-aspect, 16 / 9);
  container-type: size;
}
.stage.natural {
  height: auto;
  container-type: inline-size;
}
.stage:focus-visible::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 2px var(--primary-color);
  pointer-events: none;
  z-index: 6;
}

.scene {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--imagenote-duration) var(--imagenote-easing);
}
.stage.natural .scene {
  position: relative;
  inset: auto;
}
.scene.editing {
  cursor: default;
}
.scene.no-transition,
.scene.no-transition .face {
  transition: none !important;
}

.face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--imagenote-radius);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: var(--imagenote-note-background);
}
.face.hidden-face {
  visibility: hidden;
}
.stage.natural .face.current {
  position: relative;
  inset: auto;
}
.scene.mode-fade .face {
  transition: opacity var(--imagenote-duration) ease;
}
.scene.mode-slide .face {
  transition: transform var(--imagenote-duration) var(--imagenote-easing);
}

/* ---------- layers ---------- */
.layer {
  position: absolute;
  inset: 0;
  display: none;
}
.face.kind-image .layer-image {
  display: block;
}
.face.kind-note .layer-note {
  display: flex;
  flex-direction: column;
  color: var(--primary-text-color);
}
.stage.natural .face.current.kind-image .layer-image {
  position: relative;
  inset: auto;
}

.layer-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--imagenote-fit, cover);
  background: var(--imagenote-placeholder-background);
}
.stage.natural .face.current .layer-image img {
  height: auto;
}
.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  color: var(--secondary-text-color);
  background: var(--imagenote-placeholder-background);
  border: 2px dashed var(--divider-color, rgba(0, 0, 0, 0.12));
  border-radius: var(--imagenote-radius);
  box-sizing: border-box;
}
.stage.natural .placeholder {
  position: relative;
  min-height: 160px;
}
.placeholder ha-icon {
  --mdc-icon-size: 40px;
  opacity: 0.6;
}
.placeholder strong {
  color: var(--primary-text-color);
  font-weight: 500;
}
.placeholder small {
  font-size: 0.85em;
  max-width: 28em;
}

.title-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 36px 16px 14px;
  color: #fff;
  font-size: 1.15em;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0));
  pointer-events: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stage.with-dots .title-overlay {
  padding-bottom: 26px;
}

/* ---------- note layer ---------- */
.note-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 8px 16px;
  min-height: 24px;
}
.note-header ha-icon {
  color: var(--primary-color);
  flex: none;
}
.note-header .title {
  flex: 1;
  font-size: 1.05em;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-header.no-title .title {
  color: var(--secondary-text-color);
  font-weight: 400;
}
.note-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 16px 8px;
  line-height: 1.5;
  font-size: 0.98em;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.note-body ha-markdown {
  display: block;
}
.note-body .note-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.note-body .note-empty {
  color: var(--secondary-text-color);
}
.note-body .note-empty small {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
}
.note-body p:first-child,
.note-body ha-markdown p:first-child {
  margin-top: 0;
}
.note-footer {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px 16px 10px;
  min-height: 26px;
}
.note-footer::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -28px;
  height: 28px;
  background: linear-gradient(to bottom, transparent, var(--imagenote-note-background));
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease;
}
.layer-note.scrollable:not(.at-end) .note-footer::before {
  opacity: 1;
}
.note-meta {
  max-width: 55%;
  font-size: 0.75em;
  color: var(--secondary-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-meta:empty {
  display: none;
}

.icon-button {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--secondary-text-color);
  width: 36px;
  height: 36px;
  margin: -6px -6px -6px 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
  transition: background-color 150ms ease, color 150ms ease;
}
.icon-button:hover,
.icon-button:focus-visible {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
  color: var(--primary-color);
  outline: none;
}

.note-editor {
  display: none;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 8px;
  padding: 0 16px 12px;
}
.note-editor.visible {
  display: flex;
}
.note-editor textarea {
  flex: 1;
  min-height: 72px;
  width: 100%;
  box-sizing: border-box;
  resize: none;
  padding: 10px 12px;
  font: inherit;
  line-height: 1.45;
  color: var(--primary-text-color);
  background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  border-radius: 8px;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.note-editor textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--rgb-primary-color, 3, 169, 244), 0.2);
}
.note-editor .actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.note-editor .counter {
  flex: 1;
  font-size: 0.8em;
  color: var(--secondary-text-color);
}
.note-editor .counter.over {
  color: var(--error-color, #db4437);
}
.btn {
  appearance: none;
  font: inherit;
  font-size: 0.9em;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
  transition: background-color 150ms ease, opacity 150ms ease;
}
.btn:hover:not(:disabled) {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.06);
}
.btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-primary-color, #fff);
}
.btn.primary:hover:not(:disabled) {
  filter: brightness(1.08);
}
.btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.error-text {
  color: var(--error-color, #db4437);
  font-size: 0.85em;
}
.error-text:empty {
  display: none;
}

/* ---------- overlay: arrows, dots, hint badge ---------- */
.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
}
.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: pointer;
  opacity: 0;
  transition: opacity 200ms ease, background-color 150ms ease;
  padding: 0;
  pointer-events: auto;
}
.nav.prev { left: 8px; }
.nav.next { right: 8px; }
.nav:hover,
.nav:focus-visible {
  background: rgba(0, 0, 0, 0.55);
  outline: none;
}
.stage:hover .nav,
.stage:focus-within .nav {
  opacity: 1;
}
@media (hover: none) {
  .nav { opacity: 0.8; }
}
.stage.kind-note .nav {
  color: var(--primary-text-color);
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
}
.stage.editing .nav {
  display: none;
}

.dots {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  pointer-events: auto;
}
.dots button {
  appearance: none;
  border: none;
  padding: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 150ms ease, background-color 150ms ease;
}
.dots button.active {
  background: #fff;
  transform: scale(1.3);
}
.stage.kind-note .dots button {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.25);
  box-shadow: none;
}
.stage.kind-note .dots button.active {
  background: var(--primary-color);
}

.badge {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 8px;
  border-radius: 999px;
  font-size: 0.78em;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--imagenote-badge-color);
  background: var(--imagenote-badge-background);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0.85;
  transition: opacity 200ms ease, transform 200ms ease;
}
.badge ha-icon {
  --mdc-icon-size: 16px;
}
.stage.kind-note .badge {
  color: var(--primary-text-color);
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
}
.stage:hover .badge {
  opacity: 1;
  transform: translateY(-2px);
}
.stage.editing .badge,
.stage.editing .dots {
  display: none;
}
@media (hover: hover) {
  .stage.hover-flip:not(.editing):hover .badge {
    opacity: 0;
  }
}

/* ---------- tile grid (layout: grid) ---------- */
.tiles-card {
  display: flex;
  flex-direction: column;
  padding: var(--imagenote-tile-gap, 8px);
  box-sizing: border-box;
}
.tiles-header {
  padding: 4px 8px 8px;
  font-size: 1.05em;
  font-weight: 500;
  color: var(--primary-text-color);
}
.tiles {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: var(--imagenote-tile-gap, 8px);
  grid-template-columns: repeat(auto-fill, minmax(min(var(--imagenote-tile-min, 150px), 100%), 1fr));
  grid-auto-rows: minmax(0, 1fr);
}
.tiles.fixed-columns {
  grid-template-columns: repeat(var(--imagenote-columns, 2), minmax(0, 1fr));
}
.tiles imagenote-card {
  min-width: 0;
  min-height: 0;
  --ha-card-border-width: 0;
  --ha-card-box-shadow: none;
  --ha-card-border-radius: calc(var(--imagenote-radius) - 4px);
}

/* ---------- small cards ---------- */
@container (max-width: 260px) {
  .badge span { display: none; }
  .badge { padding: 5px; gap: 0; }
  .title-overlay { font-size: 1em; padding: 24px 12px 10px; }
  .stage.with-dots .title-overlay { padding-bottom: 22px; }
  .note-header { padding: 8px 8px 4px 12px; gap: 8px; }
  .note-header .title { font-size: 1em; }
  .note-header ha-icon { --mdc-icon-size: 20px; }
  .note-body { padding: 0 12px 6px; font-size: 0.92em; line-height: 1.4; }
  .note-footer { padding: 2px 12px 8px; }
  .nav { width: 28px; height: 28px; }
  .nav ha-icon { --mdc-icon-size: 20px; }
  .placeholder small { display: none; }
}
@container (max-height: 160px) {
  .note-meta { display: none; }
  .note-header { padding-top: 6px; padding-bottom: 2px; }
  .note-body { padding-bottom: 4px; }
  .note-footer { padding-top: 0; padding-bottom: 6px; min-height: 22px; }
  .title-overlay { padding-top: 20px; }
  .placeholder ha-icon { display: none; }
}
`;
var EDITOR_STYLES = `
:host {
  display: block;
}
.version {
  margin-top: 16px;
  font-size: 0.75em;
  color: var(--secondary-text-color);
  text-align: right;
}
`;

// src/time.ts
var UNITS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60]
];
function formatRelativeTime(date, language, now = /* @__PURE__ */ new Date()) {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1e3);
  if (!Number.isFinite(seconds)) return "";
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const abs = Math.abs(seconds);
  for (const [unit, size] of UNITS) {
    if (abs >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return formatter.format(0, "second");
}

// src/card.ts
var FACE_TEMPLATE = `
  <div class="layer layer-image">
    <img alt="" draggable="false" />
    <div class="placeholder">
      <ha-icon icon="mdi:image-plus-outline"></ha-icon>
      <strong></strong>
      <small></small>
    </div>
    <div class="title-overlay"></div>
  </div>
  <div class="layer layer-note">
    <div class="note-header">
      <ha-icon icon="mdi:note-text-outline"></ha-icon>
      <span class="title"></span>
      <button class="icon-button edit" type="button"><ha-icon icon="mdi:pencil-outline"></ha-icon></button>
    </div>
    <div class="note-body"></div>
    <div class="note-editor">
      <textarea rows="4" spellcheck="true"></textarea>
      <div class="error-text"></div>
      <div class="actions">
        <span class="counter"></span>
        <button class="btn cancel" type="button"></button>
        <button class="btn primary save" type="button"></button>
      </div>
    </div>
    <div class="note-footer"><div class="note-meta"></div></div>
  </div>`;
var TEMPLATE = `
<style>${CARD_STYLES}</style>
<ha-card>
  <div class="stage" tabindex="0" role="button">
    <div class="scene">
      <div class="face face-a current">${FACE_TEMPLATE}</div>
      <div class="face face-b hidden-face">${FACE_TEMPLATE}</div>
    </div>
    <div class="overlay">
      <button class="nav prev hidden" type="button"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
      <button class="nav next hidden" type="button"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
      <div class="dots hidden"></div>
      <div class="badge hidden"><ha-icon></ha-icon><span></span></div>
    </div>
  </div>
</ha-card>`;
function isMediaSourceId(value) {
  return value.startsWith(MEDIA_SOURCE_PREFIX);
}
var ImageNoteCard = class extends HTMLElement {
  static getConfigElement() {
    return document.createElement(EDITOR_TYPE);
  }
  static getStubConfig() {
    return {
      type: `custom:${CARD_TYPE}`,
      title: "ImageNote",
      image: SAMPLE_IMAGE,
      note: "**Hello!** Tap the picture to read this note.\n\nMarkdown works here: lists, links, *emphasis*."
    };
  }
  _root;
  _config;
  _hass;
  _lang = "en";
  _index = 0;
  _current = 0;
  _angle = 0;
  _faceAngle = [0, 0];
  _animTimer;
  _editing = false;
  _saving = false;
  _els;
  _tiles;
  _resolved = /* @__PURE__ */ new Map();
  _mediaPending = false;
  _refreshTimer;
  _autoTimer;
  _metaTimer;
  _resizeObserver;
  _gestures;
  _motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  _hoverQuery = window.matchMedia("(hover: hover)");
  _lastNote;
  _markdownReady = customElements.get("ha-markdown") !== void 0;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._ensureMarkdown();
  }
  // ---------------------------------------------------------------- lifecycle
  connectedCallback() {
    this._motionQuery.addEventListener("change", this._onMotionChange);
    this._observeResize();
    this._startTimers();
    window.clearInterval(this._metaTimer);
    this._metaTimer = window.setInterval(() => this._renderMeta(), 3e4);
  }
  disconnectedCallback() {
    this._motionQuery.removeEventListener("change", this._onMotionChange);
    this._resizeObserver?.disconnect();
    this._resizeObserver = void 0;
    this._stopTimers();
    window.clearTimeout(this._refreshTimer);
    window.clearTimeout(this._animTimer);
    window.clearInterval(this._metaTimer);
    this._metaTimer = void 0;
  }
  setConfig(config) {
    validateConfig(config);
    this._config = normalizeConfig(config);
    this._stopTimers();
    window.clearTimeout(this._animTimer);
    this._gestures?.destroy();
    this._gestures = void 0;
    this._els = void 0;
    this._tiles = void 0;
    this._editing = false;
    this._saving = false;
    this._lastNote = void 0;
    this._resolved.clear();
    if (this._config.layout === "grid" && this._config.entries.length > 1) {
      this._buildTiles(config);
      return;
    }
    this._build();
    this._applyConfig();
    this._index = this._startIndex();
    this._current = 0;
    this._resetPositions();
    this._renderSlide(this._els.faces[0], this._slide);
    this._afterSlideChange(false);
    this._observeResize();
    this._startTimers();
  }
  set hass(hass) {
    this._hass = hass;
    const lang = resolveLanguage(hass);
    if (lang !== this._lang) {
      this._lang = lang;
      this._applyStrings();
    }
    if (this._tiles) {
      for (const tile of this._tiles) tile.hass = hass;
      return;
    }
    if (this._mediaPending && this._els) {
      this._applyImage(this._currentFace, this._slide);
    }
    this._applyHass();
  }
  get hass() {
    return this._hass;
  }
  getCardSize() {
    return 4;
  }
  getGridOptions() {
    if (this._tiles) {
      const perRow = this._config?.columns || Math.min(this._tiles.length, 2);
      const tileRows = Math.ceil(this._tiles.length / perRow);
      return { columns: 12, rows: 4 * tileRows, min_columns: 6, min_rows: 2 * tileRows };
    }
    return { columns: 6, rows: 4, min_columns: 4, min_rows: 2 };
  }
  /** Next slide, or the first slide of the given kind. Also used by automations via the element. */
  flip(side) {
    if (this._tiles) {
      for (const tile of this._tiles) tile.flip(side);
      return;
    }
    if (!this._config || this._editing) return;
    if (side) {
      const target = this._config.slides.findIndex((slide) => slide.kind === side);
      if (target >= 0 && target !== this._index) this._go(target, target > this._index ? 1 : -1, true);
      return;
    }
    this.goTo("next");
  }
  /** Go to a slide by index (wraps around), or one step with "next" / "prev". */
  goTo(target) {
    const config = this._config;
    if (!config || this._editing || this._tiles) return;
    const total = config.slides.length;
    if (total < 2) return;
    let index;
    let dir = 1;
    if (target === "next") {
      index = (this._index + 1) % total;
    } else if (target === "prev") {
      index = (this._index - 1 + total) % total;
      dir = -1;
    } else {
      index = (Math.trunc(target) % total + total) % total;
      dir = index >= this._index ? 1 : -1;
    }
    if (index === this._index) return;
    this._go(index, dir, true);
    this._restartTimers();
  }
  get slide() {
    return this._slide;
  }
  get _slide() {
    const slides = this._config?.slides ?? [];
    return slides[Math.min(this._index, slides.length - 1)];
  }
  get _currentFace() {
    return this._els.faces[this._current];
  }
  _startIndex() {
    const config = this._config;
    if (!config) return 0;
    if (config.default_side === "note") {
      const first = config.slides.findIndex((slide) => slide.kind === "note");
      if (first >= 0) return first;
    }
    return 0;
  }
  // ---------------------------------------------------------------- tiles
  /** layout: grid — every config entry becomes its own tile, each a complete card of its own. */
  _buildTiles(raw) {
    const config = this._config;
    if (!config) return;
    this._root.innerHTML = `<style>${CARD_STYLES}</style><ha-card class="tiles-card"><div class="tiles-header hidden"></div><div class="tiles"></div></ha-card>`;
    const header = this._root.querySelector(".tiles-header");
    const grid = this._root.querySelector(".tiles");
    if (!header || !grid) return;
    if (config.title && config.show_title) {
      header.textContent = config.title;
      header.classList.remove("hidden");
    }
    grid.style.setProperty("--imagenote-tile-min", `${TILE_MIN_WIDTH_PX}px`);
    if (config.columns > 0) {
      grid.classList.add("fixed-columns");
      grid.style.setProperty("--imagenote-columns", String(config.columns));
    }
    const shared = { ...raw };
    for (const key of ["slides", "images", "image", "image_entity", "note", "note_entity", "note_attribute", "title", "layout", "columns"]) {
      delete shared[key];
    }
    this._tiles = config.entries.map((entry) => {
      const tile = document.createElement(CARD_TYPE);
      tile.setConfig({
        ...shared,
        type: raw.type,
        layout: "stack",
        title: entry.title,
        image: entry.image,
        image_entity: entry.image_entity,
        note: entry.note,
        note_entity: entry.note_entity,
        note_attribute: entry.note_attribute
      });
      if (this._hass) tile.hass = this._hass;
      grid.append(tile);
      return tile;
    });
  }
  // ---------------------------------------------------------------- building
  _build() {
    this._root.innerHTML = TEMPLATE;
    const q = (root, selector) => {
      const el = root.querySelector(selector);
      if (!el) throw new Error(`ImageNote: missing element ${selector}`);
      return el;
    };
    const face = (el) => ({
      el,
      img: q(el, "img"),
      placeholder: q(el, ".placeholder"),
      placeholderTitle: q(el, ".placeholder strong"),
      placeholderHelp: q(el, ".placeholder small"),
      placeholderIcon: q(el, ".placeholder ha-icon"),
      titleOverlay: q(el, ".title-overlay"),
      noteLayer: q(el, ".layer-note"),
      noteHeader: q(el, ".note-header"),
      noteTitle: q(el, ".note-header .title"),
      editButton: q(el, ".edit"),
      noteBody: q(el, ".note-body"),
      noteFooter: q(el, ".note-footer"),
      noteMeta: q(el, ".note-meta"),
      noteEditor: q(el, ".note-editor"),
      textarea: q(el, "textarea"),
      errorText: q(el, ".error-text"),
      counter: q(el, ".counter"),
      saveButton: q(el, ".save"),
      cancelButton: q(el, ".cancel"),
      src: "",
      failed: false,
      resolveToken: 0
    });
    this._els = {
      card: q(this._root, "ha-card"),
      stage: q(this._root, ".stage"),
      scene: q(this._root, ".scene"),
      faces: [face(q(this._root, ".face-a")), face(q(this._root, ".face-b"))],
      prev: q(this._root, ".nav.prev"),
      next: q(this._root, ".nav.next"),
      dots: q(this._root, ".dots"),
      badge: q(this._root, ".badge"),
      badgeIcon: q(this._root, ".badge ha-icon"),
      badgeLabel: q(this._root, ".badge span")
    };
    const els = this._els;
    this._gestures = new GestureDetector(els.stage, (kind) => void this._handleGesture(kind), {
      holdDelay: HOLD_DELAY_MS,
      doubleTapWindow: DOUBLE_TAP_WINDOW_MS,
      swipeThreshold: SWIPE_THRESHOLD_PX,
      hasDoubleTap: () => this._config?.double_tap_action.action !== "none",
      enabled: (ev) => this._gestureAllowed(ev),
      onSwipe: (direction) => this._onSwipe(direction)
    });
    els.stage.addEventListener("keydown", this._onStageKeydown);
    els.stage.addEventListener("mouseenter", this._onMouseEnter);
    els.stage.addEventListener("mouseleave", this._onMouseLeave);
    els.prev.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.goTo("prev");
    });
    els.next.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.goTo("next");
    });
    for (const view of els.faces) {
      view.img.addEventListener("error", () => this._onImageError(view));
      view.img.addEventListener("load", () => this._onImageLoad(view));
      view.editButton.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (view === this._currentFace) this._startEdit();
      });
      view.noteEditor.addEventListener("click", (ev) => ev.stopPropagation());
      view.noteEditor.addEventListener("keydown", (ev) => ev.stopPropagation());
      view.textarea.addEventListener("input", () => this._updateCounter());
      view.textarea.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          this._cancelEdit();
        } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          void this._saveEdit();
        }
      });
      view.cancelButton.addEventListener("click", () => this._cancelEdit());
      view.saveButton.addEventListener("click", () => void this._saveEdit());
      view.noteBody.addEventListener("scroll", () => this._updateScrollState(view), { passive: true });
    }
    this._buildDots();
    this._applyStrings();
  }
  _buildDots() {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const total = config.slides.length;
    const show = total > 2 && config.show_navigation;
    els.dots.replaceChildren();
    els.dots.classList.toggle("hidden", !show);
    els.prev.classList.toggle("hidden", !show);
    els.next.classList.toggle("hidden", !show);
    els.stage.classList.toggle("with-dots", show);
    if (!show) return;
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.goTo(i);
      });
      els.dots.append(dot);
    }
  }
  _applyConfig() {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const ratio = parseAspectRatio(config.aspect_ratio);
    els.stage.classList.toggle("natural", ratio === null);
    els.stage.classList.toggle("ratio", ratio !== null);
    if (ratio !== null) {
      els.stage.style.setProperty("--imagenote-aspect", String(ratio));
    } else {
      els.stage.style.removeProperty("--imagenote-aspect");
    }
    this.style.setProperty("--imagenote-fit", config.image_fit);
    els.stage.classList.toggle("hover-flip", config.hover_flip);
    els.badge.classList.toggle("hidden", !config.show_hint || config.slides.length < 2);
    this._applyMode();
  }
  _mode() {
    const config = this._config;
    if (!config) return "flip";
    return this._motionQuery.matches && config.transition !== "none" ? "fade" : config.transition;
  }
  _applyMode() {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const reduced = this._motionQuery.matches;
    const duration = reduced ? Math.min(config.duration, 200) : config.duration;
    this.style.setProperty("--imagenote-duration", `${duration}ms`);
    els.scene.classList.remove("mode-flip", "mode-fade", "mode-slide", "mode-cube", "mode-none");
    els.scene.classList.add(`mode-${this._mode()}`);
    this._resetPositions();
  }
  _applyStrings() {
    const els = this._els;
    if (!els) return;
    const t = (key) => translate(this._lang, key);
    for (const view of els.faces) {
      view.editButton.title = t("editNote");
      view.editButton.setAttribute("aria-label", t("editNote"));
      view.cancelButton.textContent = t("cancel");
      view.saveButton.textContent = this._saving ? t("saving") : t("save");
    }
    els.prev.title = t("previousPicture");
    els.prev.setAttribute("aria-label", t("previousPicture"));
    els.next.title = t("nextPicture");
    els.next.setAttribute("aria-label", t("nextPicture"));
    if (this._config) {
      this._lastNote = void 0;
      this._renderSlide(this._currentFace, this._slide);
      this._afterSlideChange(false);
    }
  }
  // ---------------------------------------------------------------- slide engine
  _rot() {
    return this._config?.direction === "vertical" ? "rotateX" : "rotateY";
  }
  _depth() {
    const els = this._els;
    if (!els) return 150;
    const rect = els.stage.getBoundingClientRect();
    const size = this._config?.direction === "vertical" ? rect.height : rect.width;
    return size > 0 ? size / 2 : 150;
  }
  /** Where a face sits for a given angle, per transition mode. */
  _faceTransform(angle) {
    const mode = this._mode();
    const sign = this._config?.direction === "vertical" ? -1 : 1;
    if (mode === "flip") return `${this._rot()}(${sign * angle}deg)`;
    if (mode === "cube") return `${this._rot()}(${sign * angle}deg) translateZ(${this._depth()}px)`;
    return "";
  }
  _sceneTransform(angle) {
    const mode = this._mode();
    const sign = this._config?.direction === "vertical" ? -1 : 1;
    if (mode === "flip") return `${this._rot()}(${-sign * angle}deg)`;
    if (mode === "cube") return `translateZ(${-this._depth()}px) ${this._rot()}(${-sign * angle}deg)`;
    return "";
  }
  /** Puts the current face in front without animation and parks the other one. */
  _resetPositions() {
    const els = this._els;
    if (!els) return;
    window.clearTimeout(this._animTimer);
    this._angle = 0;
    this._faceAngle = [0, 0];
    els.scene.classList.add("no-transition");
    els.scene.style.transform = this._sceneTransform(0);
    els.faces.forEach((view, i) => {
      view.el.style.transform = this._faceTransform(0);
      view.el.style.opacity = "";
      const isCurrent = i === this._current;
      view.el.classList.toggle("current", isCurrent);
      view.el.classList.toggle("hidden-face", !isCurrent);
    });
    void els.scene.offsetWidth;
    els.scene.classList.remove("no-transition");
  }
  _go(index, dir, animate) {
    const els = this._els;
    const config = this._config;
    if (!els || !config || this._editing) return;
    const slide = config.slides[index];
    if (!slide) return;
    const fromIndex = this._current;
    const toIndex = fromIndex === 0 ? 1 : 0;
    const from = els.faces[fromIndex];
    const to = els.faces[toIndex];
    const mode = animate ? this._mode() : "none";
    const duration = Number.parseFloat(getComputedStyle(this).getPropertyValue("--imagenote-duration")) || 0;
    window.clearTimeout(this._animTimer);
    this._index = index;
    this._lastNote = void 0;
    this._renderSlide(to, slide);
    to.el.classList.remove("hidden-face");
    to.el.classList.add("current");
    from.el.classList.remove("current");
    const axis = config.direction === "vertical" ? "translateY" : "translateX";
    switch (mode) {
      case "flip":
      case "cube": {
        this._angle += dir * (mode === "flip" ? 180 : 90);
        this._faceAngle[toIndex] = this._angle;
        to.el.style.transform = this._faceTransform(this._angle);
        els.scene.style.transform = this._sceneTransform(this._angle);
        break;
      }
      case "slide": {
        els.scene.classList.add("no-transition");
        to.el.style.transform = `${axis}(${dir * 100}%)`;
        from.el.style.transform = `${axis}(0)`;
        void els.scene.offsetWidth;
        els.scene.classList.remove("no-transition");
        to.el.style.transform = `${axis}(0)`;
        from.el.style.transform = `${axis}(${-dir * 100}%)`;
        break;
      }
      case "fade": {
        els.scene.classList.add("no-transition");
        to.el.style.opacity = "0";
        from.el.style.opacity = "1";
        void els.scene.offsetWidth;
        els.scene.classList.remove("no-transition");
        to.el.style.opacity = "1";
        from.el.style.opacity = "0";
        break;
      }
      default: {
        this._current = toIndex;
        this._resetPositions();
        break;
      }
    }
    this._current = toIndex;
    this._lastNote = slide.kind === "note" ? this._noteSource(slide) : void 0;
    if (mode !== "none") {
      this._animTimer = window.setTimeout(() => {
        from.el.classList.add("hidden-face");
        this._updateScrollState(to);
      }, duration);
    }
    this._afterSlideChange(true);
  }
  /** Dots, badge, aria and events after the visible slide changed. */
  _afterSlideChange(emit) {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const slide = this._slide;
    const total = config.slides.length;
    els.stage.classList.toggle("kind-note", slide.kind === "note");
    Array.from(els.dots.children).forEach((dot, i) => dot.classList.toggle("active", i === this._index));
    const next = config.slides[(this._index + 1) % total];
    const t = (key, vars) => translate(this._lang, key, vars);
    if (next && total > 1) {
      els.badgeIcon.setAttribute("icon", next.kind === "note" ? "mdi:note-text-outline" : "mdi:image-outline");
      els.badgeLabel.textContent = t(next.kind === "note" ? "note" : "photo");
    }
    const parts = [];
    const title = slide.title || config.title;
    if (title) parts.push(title);
    if (total > 1) parts.push(t("slide", { index: this._index + 1, total }));
    if (next && total > 1) parts.push(t(next.kind === "note" ? "showNote" : "showPhoto"));
    els.stage.setAttribute("aria-label", parts.join(" – "));
    els.stage.setAttribute("aria-pressed", String(slide.kind === "note"));
    this._updateScrollState(this._currentFace);
    if (emit) {
      const detail = { index: this._index, kind: slide.kind, side: slide.kind };
      this.dispatchEvent(new CustomEvent("imagenote-slide", { detail, bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent("imagenote-flip", { detail, bubbles: true, composed: true }));
    }
  }
  _onSwipe(direction) {
    if (!this._config || this._config.slides.length < 2 || this._editing) return;
    this.goTo(direction === "left" ? "next" : "prev");
  }
  // ---------------------------------------------------------------- rendering a slide into a face
  _renderSlide(view, slide) {
    const config = this._config;
    if (!config) return;
    view.el.classList.toggle("kind-image", slide.kind === "image");
    view.el.classList.toggle("kind-note", slide.kind === "note");
    const title = slide.title || config.title;
    if (slide.kind === "image") {
      view.titleOverlay.textContent = title;
      view.titleOverlay.classList.toggle("hidden", !(config.show_title && title));
      this._applyImage(view, slide);
    } else {
      view.noteTitle.textContent = title || translate(this._lang, "note");
      view.noteHeader.classList.toggle("no-title", !title);
      const source = this._noteSource(slide);
      if (view === this._currentFace) this._lastNote = source;
      view.editButton.classList.toggle("hidden", !source.editable);
      this._renderNote(view, source);
      this._renderMetaFor(view, source);
    }
  }
  // ---------------------------------------------------------------- picture
  _imageSourceFromEntity(slide) {
    if (!slide.image_entity || !this._hass) return void 0;
    const entity = this._hass.states[slide.image_entity];
    if (!entity) return void 0;
    const picture = entity.attributes.entity_picture;
    if (typeof picture !== "string" || !picture) return void 0;
    const domain = slide.image_entity.split(".")[0];
    if (domain === "image" || domain === "camera") {
      const join = picture.includes("?") ? "&" : "?";
      return `${picture}${join}state=${encodeURIComponent(entity.state)}`;
    }
    return picture;
  }
  _applyImage(view, slide) {
    const token = ++view.resolveToken;
    this._mediaPending = false;
    if (slide.image_entity) {
      this._setImage(view, this._imageSourceFromEntity(slide) ?? "", false);
      return;
    }
    const image = slide.image;
    if (!image) {
      this._setImage(view, "", false);
      return;
    }
    const mediaId = typeof image === "string" ? isMediaSourceId(image) ? image : void 0 : image.media_content_id;
    if (!mediaId) {
      this._setImage(view, image, false);
      return;
    }
    const cached = this._resolved.get(mediaId);
    if (cached && !cached.failed && cached.expiresAt > Date.now()) {
      this._setImage(view, cached.url, false);
      this._scheduleRefresh(cached.expiresAt);
      return;
    }
    if (!this._hass) {
      this._mediaPending = true;
      this._setImage(view, "", false);
      return;
    }
    void this._hass.callWS({
      type: "media_source/resolve_media",
      media_content_id: mediaId,
      expires: MEDIA_EXPIRES_SECONDS
    }).then((result) => {
      const expiresAt = Date.now() + MEDIA_REFRESH_MS;
      this._resolved.set(mediaId, { url: result.url, failed: false, expiresAt });
      if (token !== view.resolveToken) return;
      this._setImage(view, result.url, false);
      this._scheduleRefresh(expiresAt);
    }).catch(() => {
      this._resolved.set(mediaId, { url: "", failed: true, expiresAt: 0 });
      if (token !== view.resolveToken) return;
      this._setImage(view, "", true);
    });
  }
  _scheduleRefresh(expiresAt) {
    window.clearTimeout(this._refreshTimer);
    const delay = Math.max(1e3, expiresAt - Date.now());
    this._refreshTimer = window.setTimeout(() => {
      if (this._els && this._slide.kind === "image") this._applyImage(this._currentFace, this._slide);
    }, delay);
  }
  _setImage(view, src, failed) {
    if (src === view.src && failed === view.failed) {
      this._updatePlaceholder(view);
      return;
    }
    view.src = src;
    view.failed = failed;
    if (src) {
      view.img.src = src;
    } else {
      view.img.removeAttribute("src");
    }
    this._updatePlaceholder(view);
  }
  _updatePlaceholder(view) {
    const hasImage = Boolean(view.src) && !view.failed;
    view.placeholder.classList.toggle("hidden", hasImage);
    view.img.classList.toggle("hidden", !hasImage);
    const t = (key) => translate(this._lang, key);
    if (view.failed) {
      view.placeholderIcon.setAttribute("icon", "mdi:image-broken-variant");
      view.placeholderTitle.textContent = t("imageError");
      view.placeholderHelp.textContent = "";
    } else {
      view.placeholderIcon.setAttribute("icon", "mdi:image-plus-outline");
      view.placeholderTitle.textContent = t("noImage");
      view.placeholderHelp.textContent = t("noImageHelp");
    }
  }
  _onImageError(view) {
    if (!view.img.getAttribute("src")) return;
    view.failed = true;
    this._updatePlaceholder(view);
  }
  _onImageLoad(view) {
    view.failed = false;
    this._updatePlaceholder(view);
    this._updateDepth();
  }
  // ---------------------------------------------------------------- note
  _noteSource(slide) {
    const config = this._config;
    const empty = { text: "", editable: false, error: "", max: null, domain: "", changed: "", entityId: "" };
    if (!config) return empty;
    if (!slide.note_entity) {
      return { ...empty, text: slide.note };
    }
    const entity = this._hass?.states[slide.note_entity];
    if (!entity) {
      return {
        ...empty,
        entityId: slide.note_entity,
        error: this._hass ? translate(this._lang, "entityMissing", { entity: slide.note_entity }) : ""
      };
    }
    const domain = slide.note_entity.split(".")[0];
    const attr = slide.note_attribute;
    let text;
    if (attr) {
      const raw = entity.attributes[attr];
      text = raw === void 0 || raw === null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw);
    } else {
      text = entity.state === "unknown" || entity.state === "unavailable" ? "" : entity.state;
    }
    const max = typeof entity.attributes.max === "number" ? entity.attributes.max : null;
    return {
      text,
      editable: !attr && NOTE_ENTITY_DOMAINS.includes(domain),
      error: "",
      max,
      domain,
      changed: config.show_updated ? entity.last_changed ?? "" : "",
      entityId: slide.note_entity
    };
  }
  /** Reacts to state changes for the slide currently shown. */
  _applyHass() {
    const els = this._els;
    if (!els || !this._config) return;
    const slide = this._slide;
    const view = this._currentFace;
    if (slide.kind === "image") {
      if (slide.image_entity) {
        const src = this._imageSourceFromEntity(slide) ?? "";
        if (src !== view.src) this._setImage(view, src, false);
      }
      return;
    }
    const source = this._noteSource(slide);
    const last = this._lastNote;
    if (last && last.text === source.text && last.editable === source.editable && last.error === source.error && last.max === source.max && last.changed === source.changed && last.entityId === source.entityId) {
      return;
    }
    this._lastNote = source;
    view.editButton.classList.toggle("hidden", !source.editable || this._editing);
    if (!this._editing) {
      this._renderNote(view, source);
    }
    this._renderMetaFor(view, source);
    requestAnimationFrame(() => this._updateScrollState(view));
  }
  _renderMeta() {
    if (!this._els || !this._lastNote || this._slide.kind !== "note") return;
    this._renderMetaFor(this._currentFace, this._lastNote);
  }
  _renderMetaFor(view, source) {
    if (!source.changed || this._editing) {
      view.noteMeta.textContent = "";
      return;
    }
    const relative = formatRelativeTime(new Date(source.changed), this._lang);
    view.noteMeta.textContent = translate(this._lang, "updated", { time: relative });
  }
  _updateScrollState(view) {
    const body = view.noteBody;
    const scrollable = body.scrollHeight > body.clientHeight + 1;
    const atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
    view.noteLayer.classList.toggle("scrollable", scrollable);
    view.noteLayer.classList.toggle("at-end", atEnd);
  }
  _renderNote(view, source) {
    const body = view.noteBody;
    body.replaceChildren();
    const t = (key) => translate(this._lang, key);
    if (source.error) {
      const div = document.createElement("div");
      div.className = "error-text";
      div.textContent = source.error;
      body.append(div);
      return;
    }
    if (!source.text.trim()) {
      const div = document.createElement("div");
      div.className = "note-empty";
      const strong = document.createElement("span");
      strong.textContent = t("noNote");
      const small = document.createElement("small");
      small.textContent = t("noNoteHelp");
      div.append(strong, small);
      body.append(div);
      return;
    }
    if (this._markdownReady) {
      const md = document.createElement("ha-markdown");
      md.setAttribute("breaks", "");
      md.breaks = true;
      md.content = source.text;
      body.append(md);
    } else {
      const div = document.createElement("div");
      div.className = "note-text";
      div.textContent = source.text;
      body.append(div);
    }
  }
  _ensureMarkdown() {
    if (this._markdownReady) return;
    window.loadCardHelpers?.().then((helpers) => {
      helpers.createCardElement({ type: "markdown", content: " " });
    }).catch(() => void 0);
    void customElements.whenDefined("ha-markdown").then(() => {
      this._markdownReady = true;
      if (this._els && this._lastNote && !this._editing && this._slide.kind === "note") {
        this._renderNote(this._currentFace, this._lastNote);
      }
    });
  }
  // ---------------------------------------------------------------- editing
  _startEdit() {
    const els = this._els;
    if (!els || this._slide.kind !== "note" || !this._hass) return;
    const view = this._currentFace;
    const source = this._lastNote ?? this._noteSource(this._slide);
    if (!source.editable) return;
    this._editing = true;
    this._stopTimers();
    els.scene.classList.add("editing");
    els.stage.classList.add("editing");
    view.noteBody.style.display = "none";
    view.noteFooter.style.display = "none";
    view.editButton.classList.add("hidden");
    view.noteEditor.classList.add("visible");
    view.errorText.textContent = "";
    view.textarea.value = source.text;
    if (source.max) {
      view.textarea.maxLength = source.max;
    } else {
      view.textarea.removeAttribute("maxlength");
    }
    this._updateCounter();
    view.textarea.focus();
    view.textarea.setSelectionRange(view.textarea.value.length, view.textarea.value.length);
  }
  _finishEdit() {
    const els = this._els;
    if (!els) return;
    const view = this._currentFace;
    this._editing = false;
    this._saving = false;
    els.scene.classList.remove("editing");
    els.stage.classList.remove("editing");
    view.noteBody.style.display = "";
    view.noteFooter.style.display = "";
    view.noteEditor.classList.remove("visible");
    view.saveButton.disabled = false;
    view.cancelButton.disabled = false;
    view.saveButton.textContent = translate(this._lang, "save");
    const source = this._noteSource(this._slide);
    this._lastNote = source;
    view.editButton.classList.toggle("hidden", !source.editable);
    this._renderNote(view, source);
    this._renderMetaFor(view, source);
    this._updateScrollState(view);
    this._startTimers();
    els.stage.focus({ preventScroll: true });
  }
  _cancelEdit() {
    if (!this._editing || this._saving) return;
    this._finishEdit();
  }
  async _saveEdit() {
    const els = this._els;
    if (!els || !this._hass || !this._editing || this._saving) return;
    const view = this._currentFace;
    const source = this._lastNote ?? this._noteSource(this._slide);
    const value = view.textarea.value;
    if (value === source.text) {
      this._finishEdit();
      return;
    }
    this._saving = true;
    view.saveButton.disabled = true;
    view.cancelButton.disabled = true;
    view.saveButton.textContent = translate(this._lang, "saving");
    view.errorText.textContent = "";
    try {
      await this._hass.callService(source.domain, "set_value", { entity_id: source.entityId, value });
      this._lastNote = { ...source, text: value };
      this._finishEdit();
      this._renderNote(view, this._lastNote);
    } catch (err) {
      this._saving = false;
      view.saveButton.disabled = false;
      view.cancelButton.disabled = false;
      view.saveButton.textContent = translate(this._lang, "save");
      const message = err instanceof Error ? err.message : err?.message;
      view.errorText.textContent = `${translate(this._lang, "saveFailed")}${message ? `: ${message}` : ""}`;
    }
  }
  _updateCounter() {
    if (!this._els) return;
    const view = this._currentFace;
    const max = (this._lastNote ?? this._noteSource(this._slide)).max;
    if (!max) {
      view.counter.textContent = "";
      return;
    }
    const left = max - view.textarea.value.length;
    view.counter.textContent = translate(this._lang, "charsLeft", { count: left });
    view.counter.classList.toggle("over", left < 0);
  }
  // ---------------------------------------------------------------- interaction
  _gestureAllowed(ev) {
    if (this._editing) return false;
    for (const node of ev.composedPath()) {
      if (node instanceof HTMLAnchorElement || node instanceof HTMLButtonElement) return false;
      if (node instanceof HTMLElement && node.classList.contains("note-editor")) return false;
    }
    return true;
  }
  async _handleGesture(kind) {
    const config = this._config;
    if (!config || this._editing) return;
    if (kind === "tap") {
      const root = this._root;
      const selection = root.getSelection ? root.getSelection() : window.getSelection();
      if (selection && selection.toString().length > 0) return;
    }
    const slide = this._slide;
    const entry = config.entries[slide.entry] ?? slide;
    const action2 = kind === "hold" ? config.hold_action : kind === "double_tap" ? config.double_tap_action : config.tap_action;
    try {
      const shouldFlip = await runAction(
        this,
        this._hass,
        { note_entity: entry.note_entity, image_entity: entry.image_entity },
        action2,
        translate(this._lang, "confirm")
      );
      if (shouldFlip) this.goTo("next");
    } catch (err) {
      console.warn("ImageNote: action failed", err);
    }
  }
  _onStageKeydown = (ev) => {
    if (this._editing || ev.target !== this._els?.stage) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      void this._handleGesture("tap");
    } else if (ev.key === "ArrowRight") {
      ev.preventDefault();
      this.goTo("next");
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      this.goTo("prev");
    }
  };
  _onMouseEnter = () => {
    if (!this._config?.hover_flip || !this._hoverQuery.matches || this._editing) return;
    this.goTo("next");
  };
  _onMouseLeave = () => {
    if (!this._config?.hover_flip || !this._hoverQuery.matches || this._editing) return;
    const start = this._startIndex();
    if (start !== this._index) this._go(start, -1, true);
  };
  _onMotionChange = () => {
    this._applyMode();
  };
  // ---------------------------------------------------------------- timers & layout
  _startTimers() {
    this._stopTimers();
    const config = this._config;
    if (!this.isConnected || !config || this._tiles || !this._els) return;
    const seconds = config.auto_flip || config.auto_advance;
    if (seconds > 0 && config.slides.length > 1) {
      this._autoTimer = window.setInterval(() => {
        if (!this._editing) this.goTo("next");
      }, seconds * 1e3);
    }
  }
  _stopTimers() {
    window.clearInterval(this._autoTimer);
    this._autoTimer = void 0;
  }
  _restartTimers() {
    if (this._autoTimer !== void 0) this._startTimers();
  }
  _observeResize() {
    if (!this._els || typeof ResizeObserver === "undefined") return;
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(() => {
      this._updateDepth();
      if (this._els) this._updateScrollState(this._currentFace);
    });
    this._resizeObserver.observe(this._els.stage);
  }
  /** The cube keeps its faces at half the stage size; re-place them when the card resizes. */
  _updateDepth() {
    const els = this._els;
    if (!els || this._mode() !== "cube") return;
    els.scene.classList.add("no-transition");
    els.faces.forEach((view, i) => {
      view.el.style.transform = this._faceTransform(this._faceAngle[i]);
    });
    els.scene.style.transform = this._sceneTransform(this._angle);
    void els.scene.offsetWidth;
    els.scene.classList.remove("no-transition");
  }
};

// src/editor.ts
var UI_ACTIONS = ["more-info", "toggle", "navigate", "url", "perform-action", "none"];
var UPLOAD_TARGETS = ["image", "media"];
var EDITOR_DEFAULTS = { upload_target: "image", upload_folder: "imagenote" };
var PAGE_KEYS = ["kind", "title", "image", "image_entity", "note", "note_entity", "note_attribute"];
var LIST_KEYS = ["slides", "images"];
var TEMPLATE2 = `
<div class="pages">
  <div class="pages-label"></div>
  <div class="pages-help"></div>
  <div class="chips"></div>
  <div class="chips add-row"></div>
  <div class="status max-note"></div>
  <div class="buttons entry-actions">
    <button class="btn move-left" type="button"><ha-icon icon="mdi:arrow-left"></ha-icon><span></span></button>
    <button class="btn move-right" type="button"><ha-icon icon="mdi:arrow-right"></ha-icon><span></span></button>
    <button class="btn remove-page" type="button"><ha-icon icon="mdi:delete-outline"></ha-icon><span></span></button>
  </div>
</div>
<div class="picture">
  <div class="preview"><img alt="" draggable="false" /><ha-icon icon="mdi:image-outline"></ha-icon></div>
  <div class="picture-actions">
    <div class="picture-label"></div>
    <div class="picture-help"></div>
    <div class="buttons">
      <button class="btn primary upload" type="button"><ha-icon icon="mdi:upload"></ha-icon><span></span></button>
      <button class="btn clear" type="button"><ha-icon icon="mdi:close"></ha-icon><span></span></button>
    </div>
    <div class="status"></div>
    <input class="file" type="file" accept="image/*" hidden />
  </div>
</div>
<ha-form class="page-form"></ha-form>
<div class="divider"></div>
<ha-form class="card-form"></ha-form>
<div class="version">ImageNote ${VERSION}</div>`;
var STYLES = `
.pages {
  margin-bottom: 16px;
}
.pages-label,
.picture-label {
  font-weight: 500;
}
.pages-help,
.picture-help {
  font-size: 0.85em;
  color: var(--secondary-text-color);
  margin-top: 2px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.chip {
  appearance: none;
  font: inherit;
  font-size: 0.9em;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.chip ha-icon {
  --mdc-icon-size: 16px;
}
.add-row {
  margin-top: 8px;
}
.entry-actions {
  margin-top: 10px;
}
.entry-actions:not(:has(.btn:not(.hidden))) {
  display: none;
}
.chip.add ha-icon {
  --mdc-icon-size: 16px;
}
.chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-primary-color, #fff);
}
.picture.hidden {
  display: none;
}
.picture {
  display: flex;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 16px;
}
.preview {
  position: relative;
  flex: none;
  width: 136px;
  min-height: 92px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--secondary-background-color, #f2f2f2);
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview img:not([src]) {
  display: none;
}
.preview ha-icon {
  --mdc-icon-size: 36px;
  color: var(--secondary-text-color);
}
.preview.has-image ha-icon {
  display: none;
}
.picture-actions {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-size: 0.9em;
  font-weight: 500;
  padding: 7px 14px 7px 10px;
  border-radius: 999px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
}
.btn ha-icon {
  --mdc-icon-size: 18px;
}
.btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-primary-color, #fff);
}
.btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.btn.hidden {
  display: none;
}
.status {
  font-size: 0.85em;
  color: var(--secondary-text-color);
  min-height: 1.2em;
}
.status.error {
  color: var(--error-color, #db4437);
}
.divider {
  height: 1px;
  background: var(--divider-color, rgba(0, 0, 0, 0.12));
  margin: 20px 0;
}
@media (max-width: 480px) {
  .picture { flex-direction: column; }
  .preview { width: 100%; min-height: 140px; }
}
`;
var ImageNoteCardEditor = class extends HTMLElement {
  _root;
  _config;
  _hass;
  _lang = "en";
  _built = false;
  _pageIndex = 0;
  _pageForm;
  _cardForm;
  _chips;
  _previewImg;
  _preview;
  _fileInput;
  _status;
  _clearButton;
  _uploadButton;
  _removePageButton;
  _moveLeftButton;
  _moveRightButton;
  _uploading = false;
  _previewToken = 0;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
  }
  setConfig(config) {
    this._config = { ...config };
    const total = configPages(this._config).length;
    if (this._pageIndex >= total) this._pageIndex = total - 1;
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    const lang = resolveLanguage(hass);
    const langChanged = lang !== this._lang;
    this._lang = lang;
    if (this._pageForm) this._pageForm.hass = hass;
    if (this._cardForm) this._cardForm.hass = hass;
    if (langChanged) {
      this._render();
    } else {
      this._updatePreview();
    }
  }
  get hass() {
    return this._hass;
  }
  // ---------------------------------------------------------------- pages
  _pages() {
    return this._config ? configPages(this._config) : [{}];
  }
  _page() {
    return this._pages()[this._pageIndex] ?? {};
  }
  _kindOf(page) {
    const picture = hasPicture(page) || page.kind === "image";
    const note = hasNote(page) || page.kind === "note";
    if (picture && note) return "both";
    return note ? "note" : "image";
  }
  _slideCount(pages) {
    return expandSlides(pages.map(normalizePage)).length;
  }
  /** Writes an entry back into the config: into `slides` when there are several, flat otherwise. */
  _withPage(index, page) {
    const config = { ...this._config ?? { type: "" } };
    const pages = this._pages().map((p) => ({ ...p }));
    pages[index] = cleanPage(page);
    return this._withPages(config, pages);
  }
  _withPages(config, pages) {
    const next = { ...config };
    for (const key of PAGE_KEYS) {
      if (key !== "title") delete next[key];
    }
    for (const key of LIST_KEYS) delete next[key];
    if (pages.length <= 1) {
      const only = cleanPage(pages[0] ?? {});
      for (const key of PAGE_KEYS) {
        if (key === "title") {
          if (only.title && !next.title) next.title = only.title;
          continue;
        }
        if (only[key] !== void 0) next[key] = only[key];
      }
    } else {
      next.slides = pages.map(cleanPage);
    }
    return next;
  }
  _addPage(kind) {
    const pages = this._pages().map((p) => ({ ...p }));
    if (this._slideCount(pages) >= MAX_SLIDES) return;
    pages.push(kind === "note" ? { kind: "note" } : {});
    this._pageIndex = pages.length - 1;
    this._emit(this._withPages(this._config ?? { type: "" }, pages));
  }
  _removePage() {
    const pages = this._pages().map((p) => ({ ...p }));
    if (pages.length <= 1) return;
    pages.splice(this._pageIndex, 1);
    this._pageIndex = Math.min(this._pageIndex, pages.length - 1);
    this._emit(this._withPages(this._config ?? { type: "" }, pages));
  }
  _movePage(delta) {
    const pages = this._pages().map((p) => ({ ...p }));
    const from = this._pageIndex;
    const to = from + delta;
    if (to < 0 || to >= pages.length) return;
    [pages[from], pages[to]] = [pages[to], pages[from]];
    this._pageIndex = to;
    this._emit(this._withPages(this._config ?? { type: "" }, pages));
  }
  _selectPage(index) {
    this._pageIndex = index;
    this._render();
  }
  // ---------------------------------------------------------------- rendering
  _ensureForm() {
    if (customElements.get("ha-form")) return;
    window.loadCardHelpers?.().then((helpers) => {
      const card = helpers.createCardElement({ type: "entities", entities: [] });
      const ctor = card.constructor;
      ctor.getConfigElement?.();
    }).catch(() => void 0);
  }
  _build() {
    this._ensureForm();
    this._root.innerHTML = `<style>${EDITOR_STYLES}${STYLES}</style>${TEMPLATE2}`;
    const q = (selector) => this._root.querySelector(selector) ?? void 0;
    this._pageForm = q(".page-form");
    this._cardForm = q(".card-form");
    this._chips = q(".chips");
    this._preview = q(".preview");
    this._previewImg = q(".preview img");
    this._fileInput = q(".file");
    this._status = q(".status");
    this._clearButton = q(".clear");
    this._uploadButton = q(".upload");
    this._removePageButton = q(".remove-page");
    this._moveLeftButton = q(".move-left");
    this._moveRightButton = q(".move-right");
    this._pageForm?.addEventListener("value-changed", this._onPageValueChanged);
    this._cardForm?.addEventListener("value-changed", this._onCardValueChanged);
    this._uploadButton?.addEventListener("click", () => this._fileInput?.click());
    this._fileInput?.addEventListener("change", () => {
      const file = this._fileInput?.files?.[0];
      if (file) void this._upload(file);
      if (this._fileInput) this._fileInput.value = "";
    });
    this._clearButton?.addEventListener("click", () => {
      this._emit(this._withPage(this._pageIndex, { ...this._page(), image: void 0, image_entity: void 0 }));
    });
    this._removePageButton?.addEventListener("click", () => this._removePage());
    this._moveLeftButton?.addEventListener("click", () => this._movePage(-1));
    this._moveRightButton?.addEventListener("click", () => this._movePage(1));
    this._previewImg?.addEventListener("error", () => {
      this._preview?.classList.remove("has-image");
    });
    this._built = true;
  }
  _render() {
    if (!this._config) return;
    if (!this._built) this._build();
    const t = (key, vars) => translate(this._lang, key, vars);
    const setText = (selector, text) => {
      const el = this._root.querySelector(selector);
      if (el) el.textContent = text;
    };
    setText(".pages-label", t("editor_pages"));
    setText(".pages-help", t("editor_pages_help"));
    setText(".picture-label", t("editor_image"));
    setText(".picture-help", t("editor_image_help"));
    setText(".upload span", t("editor_upload"));
    setText(".clear span", t("editor_clear"));
    setText(".remove-page span", t("editor_remove_page"));
    setText(".move-left span", t("editor_move_left"));
    setText(".move-right span", t("editor_move_right"));
    const pages = this._pages();
    const full = this._slideCount(pages) >= MAX_SLIDES;
    if (this._chips) {
      this._chips.replaceChildren();
      pages.forEach((page, index) => {
        const kind = this._kindOf(page);
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `chip${index === this._pageIndex ? " active" : ""}`;
        chip.dataset.kind = kind;
        const icon = document.createElement("ha-icon");
        icon.setAttribute("icon", kind === "note" ? "mdi:note-text-outline" : kind === "both" ? "mdi:image-text" : "mdi:image-outline");
        const label = document.createElement("span");
        label.textContent = `${index + 1} · ${t(`editor_kind_${kind}`)}`;
        chip.append(icon, label);
        chip.addEventListener("click", () => this._selectPage(index));
        this._chips?.append(chip);
      });
    }
    const addRow = this._root.querySelector(".add-row");
    if (addRow) {
      addRow.replaceChildren();
      for (const kind of ["image", "note"]) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = `chip add add-${kind}`;
        add.innerHTML = `<ha-icon icon="mdi:plus"></ha-icon><span></span>`;
        add.querySelector("span").textContent = t(kind === "note" ? "editor_add_note" : "editor_add_page");
        add.disabled = full;
        add.addEventListener("click", () => this._addPage(kind));
        addRow.append(add);
      }
    }
    const maxNote = this._root.querySelector(".max-note");
    if (maxNote) maxNote.textContent = full ? t("editor_max_slides") : "";
    const currentKind = this._kindOf(this._page());
    this._root.querySelector(".picture")?.classList.toggle("hidden", currentKind === "note");
    this._removePageButton?.classList.toggle("hidden", pages.length <= 1);
    this._moveLeftButton?.classList.toggle("hidden", pages.length <= 1 || this._pageIndex === 0);
    this._moveRightButton?.classList.toggle("hidden", pages.length <= 1 || this._pageIndex >= pages.length - 1);
    const computeHelper = (schema) => {
      const key = `editor_${schema.name}_help`;
      const text = t(key);
      return text === key ? "" : text;
    };
    const computeLabel = (schema) => schema.name === "actions_help" ? t("editor_actions_help") : t(`editor_${schema.name}`);
    if (this._pageForm) {
      this._pageForm.hass = this._hass;
      this._pageForm.schema = this._pageSchema(pages.length > 1);
      this._pageForm.data = this._pageData();
      this._pageForm.computeLabel = computeLabel;
      this._pageForm.computeHelper = computeHelper;
    }
    if (this._cardForm) {
      this._cardForm.hass = this._hass;
      this._cardForm.schema = this._cardSchema();
      this._cardForm.data = this._cardData();
      this._cardForm.computeLabel = computeLabel;
      this._cardForm.computeHelper = computeHelper;
    }
    this._updatePreview();
  }
  _pageSchema(multiple) {
    const t = (key) => translate(this._lang, key);
    const schema = [];
    const kind = this._kindOf(this._page());
    if (multiple) {
      schema.push({ name: "page_title", selector: { text: {} } });
    }
    if (kind !== "note") {
      schema.push(
        { name: "image", selector: { text: {} } },
        {
          name: "image_entity",
          selector: {
            entity: { filter: [{ domain: "image" }, { domain: "camera" }, { domain: "person" }] }
          }
        }
      );
    }
    schema.push(
      { name: "note", selector: { text: { multiline: true } } },
      {
        name: "note_source",
        type: "expandable",
        flatten: true,
        icon: "mdi:text-box-edit-outline",
        title: t("editor_note_source"),
        expanded: Boolean(this._page().note_entity),
        schema: [
          { name: "note_entity", selector: { entity: {} } },
          {
            name: "note_attribute",
            selector: { attribute: {} },
            context: { filter_entity: "note_entity" }
          }
        ]
      }
    );
    return schema;
  }
  _cardSchema() {
    const t = (key) => translate(this._lang, key);
    const options = (values, prefix) => values.map((value) => ({ value, label: t(`${prefix}_${value}`) }));
    return [
      { name: "title", selector: { text: {} } },
      {
        name: "appearance",
        type: "expandable",
        flatten: true,
        icon: "mdi:palette-outline",
        title: t("editor_appearance"),
        expanded: true,
        schema: [
          {
            name: "appearance_grid",
            type: "grid",
            flatten: true,
            schema: [
              { name: "transition", selector: { select: { mode: "dropdown", options: options(TRANSITIONS, "transition") } } },
              { name: "direction", selector: { select: { mode: "dropdown", options: options(DIRECTIONS, "direction") } } },
              { name: "default_side", selector: { select: { mode: "dropdown", options: options(SIDES, "side") } } },
              {
                name: "aspect_ratio",
                selector: {
                  select: {
                    mode: "dropdown",
                    custom_value: true,
                    options: ASPECT_RATIOS.map((value) => ({
                      value,
                      label: value === "auto" ? t("ratio_auto") : value
                    }))
                  }
                }
              },
              { name: "image_fit", selector: { select: { mode: "dropdown", options: options(IMAGE_FITS, "fit") } } },
              {
                name: "duration",
                selector: { number: { min: 0, max: 5e3, step: 50, mode: "box", unit_of_measurement: "ms" } }
              }
            ]
          },
          {
            name: "appearance_layout",
            type: "grid",
            flatten: true,
            schema: [
              { name: "layout", selector: { select: { mode: "dropdown", options: options(LAYOUTS, "layout") } } },
              {
                name: "columns",
                selector: { number: { min: 0, max: 8, step: 1, mode: "box" } }
              }
            ]
          },
          {
            name: "appearance_toggles",
            type: "grid",
            flatten: true,
            schema: [
              { name: "show_title", selector: { boolean: {} } },
              { name: "show_hint", selector: { boolean: {} } },
              { name: "show_updated", selector: { boolean: {} } },
              { name: "show_navigation", selector: { boolean: {} } }
            ]
          }
        ]
      },
      {
        name: "upload_settings",
        type: "expandable",
        flatten: true,
        icon: "mdi:folder-image",
        title: t("editor_upload_settings"),
        schema: [
          {
            name: "upload_target",
            selector: { select: { mode: "dropdown", options: options(UPLOAD_TARGETS, "upload_target") } }
          },
          { name: "upload_folder", selector: { text: {} } }
        ]
      },
      {
        name: "behaviour",
        type: "expandable",
        flatten: true,
        icon: "mdi:gesture-tap",
        title: t("editor_behaviour"),
        schema: [
          {
            name: "behaviour_grid",
            type: "grid",
            flatten: true,
            schema: [
              {
                name: "auto_flip",
                selector: { number: { min: 0, max: 3600, step: 1, mode: "box", unit_of_measurement: "s" } }
              },
              {
                name: "auto_advance",
                selector: { number: { min: 0, max: 3600, step: 1, mode: "box", unit_of_measurement: "s" } }
              },
              { name: "hover_flip", selector: { boolean: {} } }
            ]
          },
          { name: "actions_help", type: "constant", value: "" },
          { name: "hold_action", selector: { ui_action: { actions: UI_ACTIONS, default_action: "none" } } },
          { name: "double_tap_action", selector: { ui_action: { actions: UI_ACTIONS, default_action: "none" } } }
        ]
      }
    ];
  }
  _pageData() {
    const page = this._page();
    const image = typeof page.image === "object" && page.image !== null ? page.image.media_content_id : page.image ?? "";
    return {
      page_title: page.title ?? "",
      image,
      image_entity: page.image_entity ?? "",
      note: page.note ?? "",
      note_entity: page.note_entity ?? "",
      note_attribute: page.note_attribute ?? ""
    };
  }
  _cardData() {
    const config = this._config ?? { type: "" };
    const data = { ...DEFAULTS, ...EDITOR_DEFAULTS };
    for (const [key, value] of Object.entries(config)) {
      if (LIST_KEYS.includes(key) || PAGE_KEYS.includes(key) && key !== "title") continue;
      data[key] = value;
    }
    return data;
  }
  // ---------------------------------------------------------------- events
  _onPageValueChanged = (ev) => {
    ev.stopPropagation();
    if (!this._config) return;
    const value = ev.detail.value ?? {};
    const page = { ...this._page() };
    for (const [key, raw] of Object.entries(value)) {
      const target = key === "page_title" ? "title" : key;
      if (!PAGE_KEYS.includes(target) || target === "kind") continue;
      if (raw === void 0 || raw === null || raw === "") {
        delete page[target];
      } else {
        page[target] = raw;
      }
    }
    if (page.kind === "note" && hasNote(page)) delete page.kind;
    if (page.kind === "image" && hasPicture(page)) delete page.kind;
    this._emit(this._withPage(this._pageIndex, page));
  };
  _onCardValueChanged = (ev) => {
    ev.stopPropagation();
    if (!this._config) return;
    const value = ev.detail.value ?? {};
    const next = { ...this._config };
    for (const [key, raw] of Object.entries(value)) {
      if (key === "type" || LIST_KEYS.includes(key) || PAGE_KEYS.includes(key) && key !== "title") continue;
      const fallback = key in DEFAULTS ? DEFAULTS[key] : EDITOR_DEFAULTS[key];
      const isDefault = (key in DEFAULTS || key in EDITOR_DEFAULTS) && (raw === fallback || typeof raw === "object" && raw !== null && JSON.stringify(raw) === JSON.stringify(fallback));
      if (raw === void 0 || raw === null || raw === "" || isDefault) {
        delete next[key];
      } else {
        next[key] = raw;
      }
    }
    this._emit(next);
  };
  _emit(config) {
    const cleaned = {};
    for (const [key, value] of Object.entries(config)) {
      if (value !== void 0 && value !== null && value !== "") cleaned[key] = value;
    }
    this._config = cleaned;
    this._render();
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    );
  }
  // ---------------------------------------------------------------- picture upload
  async _upload(file) {
    const hass = this._hass;
    if (!hass || this._uploading) return;
    const t = (key) => translate(this._lang, key);
    this._uploading = true;
    this._setStatus(t("editor_uploading"), false);
    if (this._uploadButton) this._uploadButton.disabled = true;
    try {
      const target = this._config?.upload_target === "media" ? "media" : "image";
      const image = target === "media" ? await this._uploadToMedia(hass, file) : await this._uploadToImageStore(hass, file);
      this._emit(this._withPage(this._pageIndex, { ...this._page(), image, image_entity: void 0 }));
      this._setStatus(t("editor_upload_done"), false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._setStatus(`${t("editor_upload_failed")}: ${message}`, true);
    } finally {
      this._uploading = false;
      if (this._uploadButton) this._uploadButton.disabled = false;
    }
  }
  async _fetch(hass, path, init) {
    if (hass.fetchWithAuth) {
      return hass.fetchWithAuth(path, init);
    }
    const token = hass.auth?.data?.access_token ?? "";
    return fetch(path, { ...init, headers: { Authorization: `Bearer ${token}` } });
  }
  _checkResponse(response) {
    const t = (key) => translate(this._lang, key);
    if (response.status === 413) throw new Error(t("editor_upload_too_large"));
    if (response.status === 401 || response.status === 403) throw new Error(t("editor_upload_forbidden"));
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  }
  /** Home Assistant's own image store (/config/image), served by id. */
  async _uploadToImageStore(hass, file) {
    const body = new FormData();
    body.append("file", file);
    const response = await this._fetch(hass, "/api/image/upload", { method: "POST", body });
    this._checkResponse(response);
    const media = await response.json();
    return `/api/image/serve/${media.id}/original`;
  }
  /** The local media folder (/media/<folder>/), stored as a plain file. */
  async _uploadToMedia(hass, file) {
    const folder = (this._config?.upload_folder ?? EDITOR_DEFAULTS.upload_folder).trim().replace(/^\/+|\/+$/g, "");
    const target = `${MEDIA_SOURCE_PREFIX}media_source/local${folder ? `/${folder}` : ""}`;
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_");
    const renamed = new File([file], `${Date.now()}-${safeName}`, { type: file.type });
    const body = new FormData();
    body.append("media_content_id", target);
    body.append("file", renamed);
    const response = await this._fetch(hass, "/api/media_source/local_source/upload", { method: "POST", body });
    this._checkResponse(response);
    const result = await response.json();
    return result.media_content_id;
  }
  _setStatus(text, isError) {
    if (!this._status) return;
    this._status.textContent = text;
    this._status.classList.toggle("error", isError);
  }
  _updatePreview() {
    const img = this._previewImg;
    const preview = this._preview;
    if (!img || !preview || !this._config) return;
    const page = this._page();
    const token = ++this._previewToken;
    const apply = (src) => {
      if (token !== this._previewToken) return;
      if (src) {
        img.src = src;
        preview.classList.add("has-image");
      } else {
        img.removeAttribute("src");
        preview.classList.remove("has-image");
      }
      this._clearButton?.classList.toggle("hidden", !src && !page.image_entity);
    };
    if (page.image_entity && this._hass) {
      const entity = this._hass.states[page.image_entity];
      const picture = entity?.attributes.entity_picture;
      apply(typeof picture === "string" ? picture : "");
      return;
    }
    const image = page.image;
    const mediaId = typeof image === "object" && image !== null ? image.media_content_id : typeof image === "string" && image.startsWith(MEDIA_SOURCE_PREFIX) ? image : void 0;
    if (!mediaId) {
      apply(typeof image === "string" ? image : "");
      return;
    }
    if (!this._hass) {
      apply("");
      return;
    }
    void this._hass.callWS({
      type: "media_source/resolve_media",
      media_content_id: mediaId,
      expires: MEDIA_EXPIRES_SECONDS
    }).then((result) => apply(result.url)).catch(() => apply(""));
  }
};
function cleanPage(page) {
  const out = {};
  for (const key of PAGE_KEYS) {
    const value = page[key];
    if (value !== void 0 && value !== null && value !== "") out[key] = value;
  }
  return out;
}

// src/imagenote-card.ts
if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, ImageNoteCard);
}
if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, ImageNoteCardEditor);
}
window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: CARD_NAME,
    description: CARD_DESCRIPTION,
    preview: true,
    documentationURL: DOCUMENTATION_URL
  });
}
console.info(
  `%c ImageNote %c ${VERSION} `,
  "color: #fff; background: #2c5364; font-weight: 600; border-radius: 4px 0 0 4px; padding: 2px 6px;",
  "color: #2c5364; background: #e6f0f3; font-weight: 500; border-radius: 0 4px 4px 0; padding: 2px 6px;"
);
export {
  ImageNoteCard,
  ImageNoteCardEditor
};
