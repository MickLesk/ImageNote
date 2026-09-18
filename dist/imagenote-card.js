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
var ASPECT_RATIOS = ["16:9", "4:3", "3:2", "1:1", "3:4", "9:16", "auto"];
var NOTE_ENTITY_DOMAINS = ["input_text", "text"];
var MEDIA_SOURCE_PREFIX = "media-source://";
var MEDIA_EXPIRES_SECONDS = 24 * 60 * 60;
var MEDIA_REFRESH_MS = (MEDIA_EXPIRES_SECONDS - 10 * 60) * 1e3;
var FLIP_ACTION = { action: "flip" };
var NONE_ACTION = { action: "none" };
var HOLD_DELAY_MS = 500;
var DOUBLE_TAP_WINDOW_MS = 250;
var DEFAULTS = {
  title: "",
  image_entity: "",
  image_fit: "cover",
  aspect_ratio: "16:9",
  note: "",
  note_entity: "",
  note_attribute: "",
  transition: "flip",
  direction: "horizontal",
  default_side: "image",
  duration: 700,
  auto_flip: 0,
  hover_flip: false,
  show_hint: true,
  show_title: true,
  show_updated: true,
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
    this._startX = ev.clientX;
    this._startY = ev.clientY;
    window.clearTimeout(this._holdTimer);
    this._holdTimer = window.setTimeout(() => {
      this._held = true;
      this._onAction("hold");
    }, this._options.holdDelay);
  };
  _onPointerMove = (ev) => {
    if (this._holdTimer === void 0) return;
    if (Math.abs(ev.clientX - this._startX) > 10 || Math.abs(ev.clientY - this._startY) > 10) {
      this._cancel();
    }
  };
  _onPointerCancel = () => {
    this._cancel();
  };
  _onContextMenu = (ev) => {
    if (this._holdTimer !== void 0 || this._held) ev.preventDefault();
  };
  _onPointerUp = (ev) => {
    if (this._holdTimer === void 0 && !this._held) return;
    if (ev.button !== 0) return;
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
  if (c.note_entity !== void 0 && c.note_entity !== "" && typeof c.note_entity !== "string") {
    throw new Error("ImageNote: note_entity must be an entity id");
  }
  if (c.image_entity !== void 0 && c.image_entity !== "" && typeof c.image_entity !== "string") {
    throw new Error("ImageNote: image_entity must be an entity id");
  }
  if (c.image !== void 0 && c.image !== null && typeof c.image !== "string" && !(typeof c.image === "object" && typeof c.image.media_content_id === "string")) {
    throw new Error("ImageNote: image must be a URL, a media-source id or a media object");
  }
}
function normalizeConfig(config) {
  return {
    type: config.type,
    title: str(config.title).trim(),
    image: config.image === null || config.image === "" ? void 0 : config.image,
    image_entity: str(config.image_entity).trim(),
    image_fit: pick(config.image_fit, IMAGE_FITS, DEFAULTS.image_fit),
    aspect_ratio: str(config.aspect_ratio, DEFAULTS.aspect_ratio).trim() || DEFAULTS.aspect_ratio,
    note: str(config.note),
    note_entity: str(config.note_entity).trim(),
    note_attribute: str(config.note_attribute).trim(),
    transition: pick(config.transition, TRANSITIONS, DEFAULTS.transition),
    direction: pick(config.direction, DIRECTIONS, DEFAULTS.direction),
    default_side: pick(config.default_side, SIDES, DEFAULTS.default_side),
    duration: num(config.duration, DEFAULTS.duration, 0, 1e4),
    auto_flip: num(config.auto_flip, DEFAULTS.auto_flip, 0, 86400),
    hover_flip: bool(config.hover_flip, DEFAULTS.hover_flip),
    show_hint: bool(config.show_hint, DEFAULTS.show_hint),
    show_title: bool(config.show_title, DEFAULTS.show_title),
    show_updated: bool(config.show_updated, DEFAULTS.show_updated),
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
}
.stage.natural {
  height: auto;
}
.stage:focus-visible::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 2px var(--primary-color);
  pointer-events: none;
  z-index: 5;
}

.scene {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.stage.natural .scene {
  position: relative;
  inset: auto;
}
.scene.editing {
  cursor: default;
}

.face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--imagenote-radius);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: var(--imagenote-note-background);
  transform: translateZ(0);
}
.stage.natural .face.front {
  position: relative;
  inset: auto;
}

/* ---------- transitions ---------- */
.scene.flip,
.scene.cube {
  transition: transform var(--imagenote-duration) var(--imagenote-easing);
}
.scene.flip.horizontal .back { transform: rotateY(180deg); }
.scene.flip.horizontal.flipped { transform: rotateY(180deg); }
.scene.flip.vertical .back { transform: rotateX(-180deg); }
.scene.flip.vertical.flipped { transform: rotateX(180deg); }

.scene.fade .face {
  transition:
    opacity var(--imagenote-duration) ease,
    visibility 0s linear var(--imagenote-duration);
}
.scene.fade .back { opacity: 0; visibility: hidden; }
.scene.fade.flipped .back { opacity: 1; visibility: visible; transition-delay: 0s, 0s; }
.scene.fade.flipped .front { opacity: 0; visibility: hidden; }

.scene.slide .face {
  transition: transform var(--imagenote-duration) var(--imagenote-easing);
}
.scene.slide.horizontal .back { transform: translateX(100%); }
.scene.slide.horizontal.flipped .front { transform: translateX(-100%); }
.scene.slide.horizontal.flipped .back { transform: translateX(0); }
.scene.slide.vertical .back { transform: translateY(100%); }
.scene.slide.vertical.flipped .front { transform: translateY(-100%); }
.scene.slide.vertical.flipped .back { transform: translateY(0); }

.scene.cube { transform: translateZ(calc(-1 * var(--imagenote-depth, 150px))); }
.scene.cube .front { transform: translateZ(var(--imagenote-depth, 150px)); }
.scene.cube.horizontal .back { transform: rotateY(90deg) translateZ(var(--imagenote-depth, 150px)); }
.scene.cube.horizontal.flipped { transform: translateZ(calc(-1 * var(--imagenote-depth, 150px))) rotateY(-90deg); }
.scene.cube.vertical .back { transform: rotateX(-90deg) translateZ(var(--imagenote-depth, 150px)); }
.scene.cube.vertical.flipped { transform: translateZ(calc(-1 * var(--imagenote-depth, 150px))) rotateX(90deg); }

.scene.none .back { visibility: hidden; }
.scene.none.flipped .back { visibility: visible; }
.scene.none.flipped .front { visibility: hidden; }

/* ---------- picture side ---------- */
.front img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--imagenote-fit, cover);
  background: var(--imagenote-placeholder-background);
}
.stage.natural .front img {
  height: auto;
}
.front img.hidden {
  display: none;
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
.placeholder.hidden {
  display: none;
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
.title-overlay.hidden {
  display: none;
}

/* ---------- note side ---------- */
.back {
  display: flex;
  flex-direction: column;
  color: var(--primary-text-color);
}
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
  padding: 0 16px 16px;
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

.note-meta {
  padding: 0 16px 10px;
  font-size: 0.75em;
  color: var(--secondary-text-color);
  max-width: calc(100% - 110px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-meta.hidden,
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
.icon-button.hidden {
  display: none;
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
  background: var(--primary-color);
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

/* ---------- flip hint badge ---------- */
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
  pointer-events: none;
  z-index: 2;
}
.badge ha-icon {
  --mdc-icon-size: 16px;
}
.back .badge {
  color: var(--primary-text-color);
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
}
.scene:hover .badge {
  opacity: 1;
  transform: translateY(-2px);
}
.badge.hidden,
.scene.editing .badge {
  display: none;
}

@media (hover: hover) {
  .scene.hover-flip:not(.editing):hover .badge {
    opacity: 0;
  }
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

// src/card.ts
var TEMPLATE = `
<style>${CARD_STYLES}</style>
<ha-card>
  <div class="stage" tabindex="0" role="button" aria-pressed="false">
    <div class="scene">
      <div class="face front">
        <img alt="" draggable="false" />
        <div class="placeholder">
          <ha-icon icon="mdi:image-plus-outline"></ha-icon>
          <strong></strong>
          <small></small>
        </div>
        <div class="title-overlay"></div>
        <div class="badge front-badge"><ha-icon icon="mdi:note-text-outline"></ha-icon><span></span></div>
      </div>
      <div class="face back">
        <div class="note-header">
          <ha-icon icon="mdi:note-text-outline"></ha-icon>
          <span class="title"></span>
          <button class="icon-button edit" type="button"><ha-icon icon="mdi:pencil-outline"></ha-icon></button>
        </div>
        <div class="note-body"></div>
        <div class="note-meta"></div>
        <div class="note-editor">
          <textarea rows="4" spellcheck="true"></textarea>
          <div class="error-text"></div>
          <div class="actions">
            <span class="counter"></span>
            <button class="btn cancel" type="button"></button>
            <button class="btn primary save" type="button"></button>
          </div>
        </div>
        <div class="badge back-badge"><ha-icon icon="mdi:image-outline"></ha-icon><span></span></div>
      </div>
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
  _side = "image";
  _editing = false;
  _saving = false;
  _els;
  _imageFailed = false;
  _mediaPending = false;
  _resolveToken = 0;
  _refreshTimer;
  _autoFlipTimer;
  _resizeObserver;
  _motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  _hoverQuery = window.matchMedia("(hover: hover)");
  _lastNote;
  _lastImageSrc;
  _gestures;
  _metaTimer;
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
    this._startAutoFlip();
    this._startMetaTimer();
  }
  disconnectedCallback() {
    this._motionQuery.removeEventListener("change", this._onMotionChange);
    this._resizeObserver?.disconnect();
    this._resizeObserver = void 0;
    this._stopAutoFlip();
    window.clearTimeout(this._refreshTimer);
    window.clearInterval(this._metaTimer);
    this._metaTimer = void 0;
  }
  setConfig(config) {
    validateConfig(config);
    this._config = normalizeConfig(config);
    this._side = this._config.default_side;
    this._editing = false;
    this._saving = false;
    this._lastNote = void 0;
    this._lastImageSrc = void 0;
    this._imageFailed = false;
    this._build();
    this._applyConfig();
    this._resolveImage();
    this._applyHass();
    this._observeResize();
    this._startAutoFlip();
  }
  set hass(hass) {
    this._hass = hass;
    const lang = resolveLanguage(hass);
    if (lang !== this._lang) {
      this._lang = lang;
      this._applyStrings();
    }
    if (this._mediaPending) {
      this._resolveImage();
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
    return { columns: 6, rows: 4, min_columns: 3, min_rows: 2 };
  }
  /** Public helper so automations / other cards can flip the card programmatically. */
  flip(side) {
    if (this._editing) return;
    this._setSide(side ?? (this._side === "image" ? "note" : "image"));
    this._restartAutoFlip();
  }
  // ---------------------------------------------------------------- rendering
  _build() {
    this._root.innerHTML = TEMPLATE;
    const q = (selector) => {
      const el = this._root.querySelector(selector);
      if (!el) throw new Error(`ImageNote: missing element ${selector}`);
      return el;
    };
    this._els = {
      card: q("ha-card"),
      stage: q(".stage"),
      scene: q(".scene"),
      front: q(".front"),
      back: q(".back"),
      img: q("img"),
      placeholder: q(".placeholder"),
      placeholderTitle: q(".placeholder strong"),
      placeholderHelp: q(".placeholder small"),
      placeholderIcon: q(".placeholder ha-icon"),
      titleOverlay: q(".title-overlay"),
      frontBadge: q(".front-badge"),
      frontBadgeLabel: q(".front-badge span"),
      backBadge: q(".back-badge"),
      backBadgeLabel: q(".back-badge span"),
      noteHeader: q(".note-header"),
      noteTitle: q(".note-header .title"),
      editButton: q(".edit"),
      noteBody: q(".note-body"),
      noteMeta: q(".note-meta"),
      noteEditor: q(".note-editor"),
      textarea: q("textarea"),
      errorText: q(".error-text"),
      counter: q(".counter"),
      saveButton: q(".save"),
      cancelButton: q(".cancel")
    };
    const els = this._els;
    this._gestures?.destroy();
    this._gestures = new GestureDetector(els.stage, (kind) => void this._handleGesture(kind), {
      holdDelay: HOLD_DELAY_MS,
      doubleTapWindow: DOUBLE_TAP_WINDOW_MS,
      hasDoubleTap: () => this._config?.double_tap_action.action !== "none",
      enabled: (ev) => this._gestureAllowed(ev)
    });
    els.stage.addEventListener("keydown", this._onStageKeydown);
    els.stage.addEventListener("mouseenter", this._onMouseEnter);
    els.stage.addEventListener("mouseleave", this._onMouseLeave);
    els.img.addEventListener("error", this._onImageError);
    els.img.addEventListener("load", this._onImageLoad);
    els.editButton.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this._startEdit();
    });
    els.noteEditor.addEventListener("click", (ev) => ev.stopPropagation());
    els.noteEditor.addEventListener("keydown", (ev) => ev.stopPropagation());
    els.textarea.addEventListener("input", () => this._updateCounter());
    els.textarea.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        this._cancelEdit();
      } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        void this._saveEdit();
      }
    });
    els.cancelButton.addEventListener("click", () => this._cancelEdit());
    els.saveButton.addEventListener("click", () => void this._saveEdit());
    this._applyStrings();
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
    this._applyTransition();
    els.scene.classList.toggle("hover-flip", config.hover_flip);
    const showTitle = config.show_title && config.title !== "";
    els.titleOverlay.textContent = config.title;
    els.titleOverlay.classList.toggle("hidden", !showTitle);
    els.noteTitle.textContent = config.title || translate(this._lang, "note");
    els.noteHeader.classList.toggle("no-title", config.title === "");
    els.frontBadge.classList.toggle("hidden", !config.show_hint);
    els.backBadge.classList.toggle("hidden", !config.show_hint);
    this._applySide();
  }
  _applyTransition() {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const reduced = this._motionQuery.matches;
    const transition = reduced && config.transition !== "none" ? "fade" : config.transition;
    const duration = reduced ? Math.min(config.duration, 200) : config.duration;
    els.scene.classList.remove("flip", "fade", "slide", "cube", "none", "horizontal", "vertical");
    els.scene.classList.add(transition, config.direction);
    this.style.setProperty("--imagenote-duration", `${duration}ms`);
    this._updateDepth();
  }
  _applyStrings() {
    const els = this._els;
    if (!els) return;
    const t = (key) => translate(this._lang, key);
    els.frontBadgeLabel.textContent = t("note");
    els.backBadgeLabel.textContent = t("photo");
    els.editButton.title = t("editNote");
    els.editButton.setAttribute("aria-label", t("editNote"));
    els.cancelButton.textContent = t("cancel");
    els.saveButton.textContent = this._saving ? t("saving") : t("save");
    if (this._config && !this._config.title) {
      els.noteTitle.textContent = t("note");
    }
    this._updatePlaceholder();
    this._applySide();
    this._lastNote = void 0;
    this._applyHass();
  }
  _applySide() {
    const els = this._els;
    if (!els) return;
    const flipped = this._side === "note";
    els.scene.classList.toggle("flipped", flipped);
    els.stage.setAttribute("aria-pressed", String(flipped));
    const title = this._config?.title ? `${this._config.title} – ` : "";
    els.stage.setAttribute(
      "aria-label",
      title + translate(this._lang, flipped ? "showPhoto" : "showNote")
    );
  }
  _setSide(side) {
    if (side === this._side) return;
    this._side = side;
    this._applySide();
    this.dispatchEvent(
      new CustomEvent("imagenote-flip", { detail: { side }, bubbles: true, composed: true })
    );
  }
  // ---------------------------------------------------------------- picture
  _imageSourceFromEntity() {
    const config = this._config;
    if (!config?.image_entity || !this._hass) return void 0;
    const entity = this._hass.states[config.image_entity];
    if (!entity) return void 0;
    const picture = entity.attributes.entity_picture;
    if (typeof picture !== "string" || !picture) return void 0;
    const domain = config.image_entity.split(".")[0];
    if (domain === "image" || domain === "camera") {
      const join = picture.includes("?") ? "&" : "?";
      return `${picture}${join}state=${encodeURIComponent(entity.state)}`;
    }
    return picture;
  }
  _resolveImage() {
    const config = this._config;
    if (!config) return;
    const token = ++this._resolveToken;
    window.clearTimeout(this._refreshTimer);
    this._imageFailed = false;
    this._mediaPending = false;
    const fromEntity = this._imageSourceFromEntity();
    if (config.image_entity) {
      this._setImage(fromEntity ?? "");
      return;
    }
    const image = config.image;
    if (!image) {
      this._setImage("");
      return;
    }
    let mediaId;
    if (typeof image === "string") {
      if (!isMediaSourceId(image)) {
        this._setImage(image);
        return;
      }
      mediaId = image;
    } else {
      mediaId = image.media_content_id;
    }
    if (!this._hass) {
      this._mediaPending = true;
      this._setImage("");
      return;
    }
    void this._hass.callWS({
      type: "media_source/resolve_media",
      media_content_id: mediaId,
      expires: MEDIA_EXPIRES_SECONDS
    }).then((result) => {
      if (token !== this._resolveToken) return;
      this._setImage(result.url);
      this._refreshTimer = window.setTimeout(() => this._resolveImage(), MEDIA_REFRESH_MS);
    }).catch(() => {
      if (token !== this._resolveToken) return;
      this._imageFailed = true;
      this._setImage("");
    });
  }
  _setImage(src) {
    const els = this._els;
    if (!els) return;
    if (src === this._lastImageSrc && !this._imageFailed) {
      return;
    }
    this._lastImageSrc = src;
    if (src) {
      els.img.src = src;
      els.img.classList.remove("hidden");
    } else {
      els.img.removeAttribute("src");
      els.img.classList.add("hidden");
    }
    this._updatePlaceholder();
  }
  _updatePlaceholder() {
    const els = this._els;
    if (!els) return;
    const hasImage = Boolean(this._lastImageSrc) && !this._imageFailed;
    els.placeholder.classList.toggle("hidden", hasImage);
    els.img.classList.toggle("hidden", !hasImage);
    const t = (key) => translate(this._lang, key);
    if (this._imageFailed) {
      els.placeholderIcon.setAttribute("icon", "mdi:image-broken-variant");
      els.placeholderTitle.textContent = t("imageError");
      els.placeholderHelp.textContent = "";
    } else {
      els.placeholderIcon.setAttribute("icon", "mdi:image-plus-outline");
      els.placeholderTitle.textContent = t("noImage");
      els.placeholderHelp.textContent = t("noImageHelp");
    }
  }
  _onImageError = () => {
    if (!this._lastImageSrc) return;
    this._imageFailed = true;
    this._updatePlaceholder();
  };
  _onImageLoad = () => {
    this._imageFailed = false;
    this._updatePlaceholder();
    this._updateDepth();
  };
  // ---------------------------------------------------------------- note
  _noteSource() {
    const config = this._config;
    const empty = { text: "", editable: false, error: "", max: null, domain: "", changed: "" };
    if (!config) return empty;
    if (!config.note_entity) {
      return { ...empty, text: config.note };
    }
    const entity = this._hass?.states[config.note_entity];
    if (!entity) {
      return {
        ...empty,
        error: this._hass ? translate(this._lang, "entityMissing", { entity: config.note_entity }) : ""
      };
    }
    const domain = config.note_entity.split(".")[0];
    const attr = config.note_attribute;
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
      changed: config.show_updated ? entity.last_changed ?? "" : ""
    };
  }
  _applyHass() {
    const els = this._els;
    if (!els || !this._config) return;
    if (this._config.image_entity) {
      const src = this._imageSourceFromEntity() ?? "";
      if (src !== this._lastImageSrc) {
        this._imageFailed = false;
        this._setImage(src);
      }
    }
    const source = this._noteSource();
    const last = this._lastNote;
    if (last && last.text === source.text && last.editable === source.editable && last.error === source.error && last.max === source.max && last.changed === source.changed) {
      return;
    }
    this._lastNote = source;
    els.editButton.classList.toggle("hidden", !source.editable || this._editing);
    if (!this._editing) {
      this._renderNote(source);
    }
    this._renderMeta();
  }
  _renderMeta() {
    const els = this._els;
    if (!els) return;
    const changed = this._lastNote?.changed;
    if (!changed || this._editing) {
      els.noteMeta.textContent = "";
      els.noteMeta.classList.add("hidden");
      return;
    }
    const relative = formatRelativeTime(new Date(changed), this._lang);
    els.noteMeta.textContent = translate(this._lang, "updated", { time: relative });
    els.noteMeta.classList.remove("hidden");
  }
  _startMetaTimer() {
    window.clearInterval(this._metaTimer);
    this._metaTimer = window.setInterval(() => this._renderMeta(), 3e4);
  }
  _renderNote(source) {
    const els = this._els;
    if (!els) return;
    const body = els.noteBody;
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
      if (this._lastNote && !this._editing) {
        this._renderNote(this._lastNote);
      }
    });
  }
  // ---------------------------------------------------------------- editing
  _startEdit() {
    const els = this._els;
    const source = this._lastNote ?? this._noteSource();
    if (!els || !source.editable || !this._hass) return;
    this._editing = true;
    this._stopAutoFlip();
    this._setSide("note");
    els.scene.classList.add("editing");
    els.noteBody.style.display = "none";
    els.editButton.classList.add("hidden");
    els.noteEditor.classList.add("visible");
    els.noteMeta.classList.add("hidden");
    els.errorText.textContent = "";
    els.textarea.value = source.text;
    if (source.max) {
      els.textarea.maxLength = source.max;
    } else {
      els.textarea.removeAttribute("maxlength");
    }
    this._updateCounter();
    els.textarea.focus();
    els.textarea.setSelectionRange(els.textarea.value.length, els.textarea.value.length);
  }
  _finishEdit() {
    const els = this._els;
    if (!els) return;
    this._editing = false;
    this._saving = false;
    els.scene.classList.remove("editing");
    els.noteBody.style.display = "";
    els.noteEditor.classList.remove("visible");
    els.saveButton.disabled = false;
    els.cancelButton.disabled = false;
    els.saveButton.textContent = translate(this._lang, "save");
    const source = this._noteSource();
    this._lastNote = source;
    els.editButton.classList.toggle("hidden", !source.editable);
    this._renderNote(source);
    this._renderMeta();
    this._startAutoFlip();
    els.stage.focus({ preventScroll: true });
  }
  _cancelEdit() {
    if (!this._editing || this._saving) return;
    this._finishEdit();
  }
  async _saveEdit() {
    const els = this._els;
    const config = this._config;
    if (!els || !config || !this._hass || !this._editing || this._saving) return;
    const source = this._lastNote ?? this._noteSource();
    const value = els.textarea.value;
    if (value === source.text) {
      this._finishEdit();
      return;
    }
    this._saving = true;
    els.saveButton.disabled = true;
    els.cancelButton.disabled = true;
    els.saveButton.textContent = translate(this._lang, "saving");
    els.errorText.textContent = "";
    try {
      await this._hass.callService(source.domain, "set_value", {
        entity_id: config.note_entity,
        value
      });
      this._lastNote = { ...source, text: value };
      this._finishEdit();
      this._renderNote(this._lastNote);
    } catch (err) {
      this._saving = false;
      els.saveButton.disabled = false;
      els.cancelButton.disabled = false;
      els.saveButton.textContent = translate(this._lang, "save");
      const message = err instanceof Error ? err.message : err?.message;
      els.errorText.textContent = `${translate(this._lang, "saveFailed")}${message ? `: ${message}` : ""}`;
    }
  }
  _updateCounter() {
    const els = this._els;
    if (!els) return;
    const max = this._lastNote?.max ?? null;
    if (!max) {
      els.counter.textContent = "";
      return;
    }
    const left = max - els.textarea.value.length;
    els.counter.textContent = translate(this._lang, "charsLeft", { count: left });
    els.counter.classList.toggle("over", left < 0);
  }
  // ---------------------------------------------------------------- interaction
  _gestureAllowed(ev) {
    if (this._editing) return false;
    for (const node of ev.composedPath()) {
      if (node instanceof HTMLAnchorElement || node instanceof HTMLButtonElement) return false;
      if (node === this._els?.noteEditor) return false;
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
    const action2 = kind === "hold" ? config.hold_action : kind === "double_tap" ? config.double_tap_action : config.tap_action;
    try {
      const shouldFlip = await runAction(this, this._hass, config, action2, translate(this._lang, "confirm"));
      if (shouldFlip) this.flip();
    } catch (err) {
      console.warn("ImageNote: action failed", err);
    }
  }
  _onStageKeydown = (ev) => {
    if (this._editing) return;
    if (ev.target !== this._els?.stage) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      void this._handleGesture("tap");
    }
  };
  _onMouseEnter = () => {
    if (!this._config?.hover_flip || !this._hoverQuery.matches || this._editing) return;
    this._setSide("note");
  };
  _onMouseLeave = () => {
    if (!this._config?.hover_flip || !this._hoverQuery.matches || this._editing) return;
    this._setSide(this._config.default_side);
  };
  _onMotionChange = () => {
    this._applyTransition();
  };
  // ---------------------------------------------------------------- timers & layout
  _startAutoFlip() {
    this._stopAutoFlip();
    const seconds = this._config?.auto_flip ?? 0;
    if (!this.isConnected || seconds <= 0) return;
    this._autoFlipTimer = window.setInterval(() => {
      if (this._editing) return;
      this._setSide(this._side === "image" ? "note" : "image");
    }, seconds * 1e3);
  }
  _stopAutoFlip() {
    if (this._autoFlipTimer !== void 0) {
      window.clearInterval(this._autoFlipTimer);
      this._autoFlipTimer = void 0;
    }
  }
  _restartAutoFlip() {
    if (this._autoFlipTimer !== void 0) {
      this._startAutoFlip();
    }
  }
  _observeResize() {
    if (!this._els || typeof ResizeObserver === "undefined") return;
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(() => this._updateDepth());
    this._resizeObserver.observe(this._els.stage);
  }
  /** The cube transition needs half the stage size as its rotation depth. */
  _updateDepth() {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const rect = els.stage.getBoundingClientRect();
    const size = config.direction === "vertical" ? rect.height : rect.width;
    if (size > 0) {
      els.scene.style.setProperty("--imagenote-depth", `${size / 2}px`);
    }
  }
};

// src/editor.ts
var UI_ACTIONS = ["more-info", "toggle", "navigate", "url", "perform-action", "none"];
var PICTURE_TEMPLATE = `
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
</div>`;
var PICTURE_STYLES = `
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
.picture-label {
  font-weight: 500;
}
.picture-help {
  font-size: 0.85em;
  color: var(--secondary-text-color);
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
  _form;
  _built = false;
  _previewImg;
  _preview;
  _fileInput;
  _status;
  _clearButton;
  _uploadButton;
  _uploading = false;
  _previewToken = 0;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
  }
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    const lang = resolveLanguage(hass);
    const langChanged = lang !== this._lang;
    this._lang = lang;
    if (this._form) {
      this._form.hass = hass;
    }
    if (langChanged) {
      this._render();
    } else {
      this._updatePreview();
    }
  }
  get hass() {
    return this._hass;
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
    this._root.innerHTML = `<style>${EDITOR_STYLES}${PICTURE_STYLES}</style>${PICTURE_TEMPLATE}<ha-form></ha-form><div class="version">ImageNote ${VERSION}</div>`;
    this._form = this._root.querySelector("ha-form") ?? void 0;
    this._preview = this._root.querySelector(".preview") ?? void 0;
    this._previewImg = this._root.querySelector(".preview img") ?? void 0;
    this._fileInput = this._root.querySelector(".file") ?? void 0;
    this._status = this._root.querySelector(".status") ?? void 0;
    this._clearButton = this._root.querySelector(".clear") ?? void 0;
    this._uploadButton = this._root.querySelector(".upload") ?? void 0;
    this._form?.addEventListener("value-changed", this._onValueChanged);
    this._uploadButton?.addEventListener("click", () => this._fileInput?.click());
    this._fileInput?.addEventListener("change", () => {
      const file = this._fileInput?.files?.[0];
      if (file) void this._upload(file);
      if (this._fileInput) this._fileInput.value = "";
    });
    this._clearButton?.addEventListener("click", () => {
      this._emit({ ...this._config, image: void 0, image_entity: void 0 });
    });
    this._previewImg?.addEventListener("error", () => {
      this._preview?.classList.remove("has-image");
    });
    this._built = true;
  }
  _render() {
    if (!this._config) return;
    if (!this._built) this._build();
    const form = this._form;
    if (!form) return;
    const t = (key) => translate(this._lang, key);
    const label = this._root.querySelector(".picture-label");
    const help = this._root.querySelector(".picture-help");
    if (label) label.textContent = t("editor_image");
    if (help) help.textContent = t("editor_image_help");
    const uploadLabel = this._root.querySelector(".upload span");
    if (uploadLabel) uploadLabel.textContent = t("editor_upload");
    const clearLabel = this._root.querySelector(".clear span");
    if (clearLabel) clearLabel.textContent = t("editor_clear");
    form.hass = this._hass;
    form.schema = this._schema();
    form.data = this._formData();
    form.computeLabel = (schema) => schema.name === "actions_help" ? t("editor_actions_help") : t(`editor_${schema.name}`);
    form.computeHelper = (schema) => {
      const key = `editor_${schema.name}_help`;
      const text = t(key);
      return text === key ? "" : text;
    };
    this._updatePreview();
  }
  _schema() {
    const t = (key) => translate(this._lang, key);
    const options = (values, prefix) => values.map((value) => ({ value, label: t(`${prefix}_${value}`) }));
    return [
      { name: "title", selector: { text: {} } },
      { name: "image", selector: { text: {} } },
      {
        name: "image_entity",
        selector: {
          entity: { filter: [{ domain: "image" }, { domain: "camera" }, { domain: "person" }] }
        }
      },
      { name: "note", selector: { text: { multiline: true } } },
      {
        name: "note_source",
        type: "expandable",
        flatten: true,
        icon: "mdi:text-box-edit-outline",
        title: t("editor_note_source"),
        expanded: Boolean(this._config?.note_entity),
        schema: [
          { name: "note_entity", selector: { entity: {} } },
          {
            name: "note_attribute",
            selector: { attribute: {} },
            context: { filter_entity: "note_entity" }
          },
          { name: "show_updated", selector: { boolean: {} } }
        ]
      },
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
            name: "appearance_toggles",
            type: "grid",
            flatten: true,
            schema: [
              { name: "show_title", selector: { boolean: {} } },
              { name: "show_hint", selector: { boolean: {} } }
            ]
          }
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
  _formData() {
    const config = this._config ?? {};
    const image = typeof config.image === "object" && config.image !== null ? config.image.media_content_id : config.image ?? "";
    return {
      ...DEFAULTS,
      ...config,
      image
    };
  }
  // ---------------------------------------------------------------- events
  _onValueChanged = (ev) => {
    ev.stopPropagation();
    if (!this._config) return;
    const value = ev.detail.value ?? {};
    const next = { ...this._config };
    for (const [key, raw] of Object.entries(value)) {
      if (key === "type") continue;
      const fallback = DEFAULTS[key];
      const isDefault = key in DEFAULTS && (raw === fallback || typeof raw === "object" && raw !== null && JSON.stringify(raw) === JSON.stringify(fallback));
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
    if (this._form) {
      this._form.data = this._formData();
    }
    this._updatePreview();
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
      const body = new FormData();
      body.append("file", file);
      const init = { method: "POST", body };
      let response;
      if (hass.fetchWithAuth) {
        response = await hass.fetchWithAuth("/api/image/upload", init);
      } else {
        const token = hass.auth?.data?.access_token ?? "";
        response = await fetch("/api/image/upload", {
          ...init,
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      if (response.status === 413) {
        throw new Error(t("editor_upload_too_large"));
      }
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const media = await response.json();
      const url = `/api/image/serve/${media.id}/original`;
      this._setStatus(t("editor_upload_done"), false);
      this._emit({ ...this._config, image: url, image_entity: void 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._setStatus(`${t("editor_upload_failed")}: ${message}`, true);
    } finally {
      this._uploading = false;
      if (this._uploadButton) this._uploadButton.disabled = false;
    }
  }
  _setStatus(text, isError) {
    if (!this._status) return;
    this._status.textContent = text;
    this._status.classList.toggle("error", isError);
  }
  _updatePreview() {
    const img = this._previewImg;
    const preview = this._preview;
    const config = this._config;
    if (!img || !preview || !config) return;
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
      this._clearButton?.classList.toggle("hidden", !src && !config.image_entity);
    };
    if (config.image_entity && this._hass) {
      const entity = this._hass.states[config.image_entity];
      const picture = entity?.attributes.entity_picture;
      apply(typeof picture === "string" ? picture : "");
      return;
    }
    const image = config.image;
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
