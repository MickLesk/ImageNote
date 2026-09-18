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
var NOTE_STYLES = ["plain", "sticky"];
var EXPIRED_MODES = ["dim", "hide"];
var CHECKLIST_STORAGE_PREFIX = "imagenote:checks:";
var ASPECT_RATIOS = ["16:9", "4:3", "3:2", "1:1", "3:4", "9:16", "auto"];
var NOTE_ENTITY_DOMAINS = ["input_text", "text"];
var IMAGE_URL_ENTITY_DOMAINS = ["input_text", "text"];
var MAX_MARKERS = 20;
var MAX_RECORDING_SECONDS = 180;
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
  note_style: "plain",
  expired_slides: "dim",
  checklist: true,
  checklist_writeback: true,
  upload_target: "image",
  upload_folder: "imagenote",
  upload_max_size: 1920,
  upload_crop: false,
  ken_burns: false,
  show_camera: true,
  show_record: true,
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
  for (const key of ["image", "audio"]) {
    const value = c[key];
    if (value !== void 0 && value !== null && typeof value !== "string" && !(typeof value === "object" && typeof value.media_content_id === "string")) {
      throw new Error(`ImageNote: ${prefix}${key} must be a URL, a media-source id or a media object`);
    }
  }
}
function normalizeMarkers(markers) {
  if (!Array.isArray(markers)) return [];
  const out = [];
  for (const raw of markers) {
    if (!raw || typeof raw !== "object") continue;
    const x = num(raw.x, Number.NaN, 0, 100);
    const y = num(raw.y, Number.NaN, 0, 100);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({
      x,
      y,
      label: str(raw.label).trim(),
      icon: str(raw.icon).trim(),
      entity: str(raw.entity).trim()
    });
  }
  return out;
}
function normalizePage(page) {
  return {
    kind: page.kind === "note" || page.kind === "image" || page.kind === "audio" ? page.kind : void 0,
    title: str(page.title).trim(),
    image: page.image === null || page.image === "" ? void 0 : page.image,
    image_entity: str(page.image_entity).trim(),
    note: str(page.note),
    note_entity: str(page.note_entity).trim(),
    note_attribute: str(page.note_attribute).trim(),
    expires: str(page.expires).trim(),
    color: str(page.color).trim(),
    markers: normalizeMarkers(page.markers),
    audio: page.audio === null || page.audio === "" ? void 0 : page.audio,
    audio_entity: str(page.audio_entity).trim()
  };
}
function hasAudio(page) {
  return Boolean(page.audio) || Boolean(page.audio_entity);
}
function configPages(config) {
  const list = Array.isArray(config.slides) && config.slides.length > 0 ? config.slides : config.images;
  if (Array.isArray(list) && list.length > 0) {
    return list.map((entry) => typeof entry === "string" ? { image: entry } : entry);
  }
  return [
    {
      kind: config.kind,
      image: config.image,
      image_entity: config.image_entity,
      note: config.note,
      note_entity: config.note_entity,
      note_attribute: config.note_attribute,
      expires: config.expires,
      color: config.color,
      markers: config.markers,
      audio: config.audio,
      audio_entity: config.audio_entity
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
    const audio = hasAudio(entry) || entry.kind === "audio";
    if (picture || !note && !audio) {
      slides.push({ ...entry, kind: "image", entry: index, note: "", note_entity: "", note_attribute: "", audio: void 0, audio_entity: "" });
    }
    if (note) {
      slides.push({ ...entry, kind: "note", entry: index, image: void 0, image_entity: "", audio: void 0, audio_entity: "" });
    }
    if (audio) {
      slides.push({ ...entry, kind: "audio", entry: index, image: void 0, image_entity: "", note: "", note_entity: "", note_attribute: "" });
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
    note_style: pick(config.note_style, NOTE_STYLES, DEFAULTS.note_style),
    expired_slides: pick(config.expired_slides, EXPIRED_MODES, DEFAULTS.expired_slides),
    checklist: bool(config.checklist, DEFAULTS.checklist),
    checklist_writeback: bool(config.checklist_writeback, DEFAULTS.checklist_writeback),
    upload_target: config.upload_target === "media" ? "media" : "image",
    upload_folder: str(config.upload_folder, DEFAULTS.upload_folder),
    upload_max_size: Math.round(num(config.upload_max_size, DEFAULTS.upload_max_size, 0, 8e3)),
    upload_crop: bool(config.upload_crop, DEFAULTS.upload_crop),
    ken_burns: bool(config.ken_burns, DEFAULTS.ken_burns),
    show_camera: bool(config.show_camera, DEFAULTS.show_camera),
    show_record: bool(config.show_record, DEFAULTS.show_record),
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
  expired: "Expired",
  expiresOn: "Until {date}",
  templateError: "Template error",
  takePhoto: "Take a photo",
  audio: "Audio",
  showAudio: "Play audio",
  play: "Play",
  pause: "Pause",
  record: "Record a memo",
  stopRecording: "Stop recording",
  recording: "Recording… {seconds}s",
  noAudio: "No recording yet",
  noAudioHelp: "Record a memo or add an audio file in the card editor.",
  audioError: "The recording could not be loaded",
  micDenied: "Microphone access was denied",
  micUnsupported: "Recording is not supported in this browser",
  uploading: "Uploading…",
  uploadFailed: "Upload failed",
  uploadTooLarge: "The file is too large",
  uploadForbidden: "Only administrators can upload to the media folder",
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
  editor_note_source: "Note from an entity",
  editor_upload: "Upload picture",
  editor_clear: "Remove",
  editor_uploading: "Uploading…",
  editor_upload_done: "Uploaded. The picture is stored by Home Assistant.",
  editor_upload_failed: "Upload failed",
  editor_upload_too_large: "The file is too large",
  editor_note: "Note",
  editor_note_help: "Markdown, checklists (- [ ] item) and templates ({{ states('sensor.x') }}) are supported. Ignored when a note entity is set.",
  editor_expires: "Valid until (optional)",
  editor_expires_help: 'Afterwards the page is dimmed or hidden, see "Expired pages" in Appearance.',
  editor_color: "Page colour (optional)",
  editor_note_style: "Note pages look",
  note_style_plain: "Plain card",
  note_style_sticky: "Sticky note",
  editor_expired_slides: "Expired pages",
  expired_dim: "Dim and mark",
  expired_hide: "Hide",
  editor_checklist: "Interactive checklists",
  editor_checklist_help: '"- [ ] item" lines become checkboxes. Notes from an input_text or text entity are written back; others remember the ticks in this browser.',
  editor_checklist_writeback: "Write ticks back to the entity",
  color_none: "Card colour",
  color_yellow: "Yellow",
  color_green: "Green",
  color_blue: "Blue",
  color_pink: "Pink",
  color_orange: "Orange",
  color_purple: "Purple",
  color_grey: "Grey",
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
  editor_add_audio: "Audio",
  editor_kind_audio: "Audio",
  editor_audio: "Audio",
  editor_audio_help: "Record a memo, upload an audio file, or enter a URL or media-source id. Recordings are stored in the media folder.",
  editor_audio_url: "Audio URL",
  editor_audio_entity: "Audio entity (optional)",
  editor_audio_entity_help: "An input_text / text entity holding the audio address. The card then gets a record button that stores new memos in it.",
  editor_record: "Record",
  editor_stop: "Stop",
  editor_upload_audio: "Upload audio file",
  editor_show_record: "Record button on audio from an input_text",
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
  editor_upload_max_size: "Scale pictures down to",
  editor_upload_max_size_help: "Longest edge in pixels before upload. 0 keeps the original size.",
  editor_upload_crop: "Crop uploads to the card's aspect ratio",
  editor_preview: "Preview",
  editor_preview_help: "Tap the preview or the button to see the animation.",
  editor_play: "Play animation",
  editor_import: "Import from a media folder",
  editor_import_help: "Adds every picture in a folder below /media as a page, up to the limit of 10.",
  editor_import_button: "Import",
  editor_import_done: "{count} pictures added.",
  editor_import_none: "No pictures found in {folder}.",
  editor_import_failed: "Import failed",
  editor_drag_hint: "Drag to reorder",
  editor_ken_burns: "Slow zoom on pictures (Ken Burns)",
  editor_show_camera: "Camera button on pictures from an input_text",
  editor_show_camera_help: "When a picture comes from an input_text or text entity, a camera button on the card takes or picks a new photo and stores its address in the entity.",
  editor_image_entity_help: "Use the picture of an image, camera or person entity, or an input_text / text entity that holds a picture address.",
  editor_markers: "Markers on the picture",
  editor_markers_help: "Click on the preview to add a pin. Select a pin in the list to move it with another click.",
  editor_marker_label: "Label",
  editor_marker_icon: "Icon (optional)",
  editor_marker_entity: "Entity (optional)",
  editor_marker_remove: "Remove pin",
  editor_marker_none: "No pins yet.",
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
  expired: "Abgelaufen",
  expiresOn: "Bis {date}",
  templateError: "Template-Fehler",
  takePhoto: "Foto aufnehmen",
  audio: "Audio",
  showAudio: "Audio abspielen",
  play: "Abspielen",
  pause: "Pause",
  record: "Memo aufnehmen",
  stopRecording: "Aufnahme beenden",
  recording: "Aufnahme… {seconds}s",
  noAudio: "Noch keine Aufnahme",
  noAudioHelp: "Nimm ein Memo auf oder füge im Karteneditor eine Audiodatei hinzu.",
  audioError: "Die Aufnahme konnte nicht geladen werden",
  micDenied: "Zugriff auf das Mikrofon wurde verweigert",
  micUnsupported: "Aufnehmen wird in diesem Browser nicht unterstützt",
  uploading: "Wird hochgeladen…",
  uploadFailed: "Upload fehlgeschlagen",
  uploadTooLarge: "Die Datei ist zu groß",
  uploadForbidden: "Nur Administratoren können in den Medienordner hochladen",
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
  editor_note_source: "Notiz aus einer Entität",
  editor_upload: "Bild hochladen",
  editor_clear: "Entfernen",
  editor_uploading: "Wird hochgeladen…",
  editor_upload_done: "Hochgeladen. Home Assistant speichert das Bild.",
  editor_upload_failed: "Upload fehlgeschlagen",
  editor_upload_too_large: "Die Datei ist zu groß",
  editor_note: "Notiz",
  editor_note_help: "Markdown, Checklisten (- [ ] Punkt) und Templates ({{ states('sensor.x') }}) werden unterstützt. Wird ignoriert, wenn eine Notiz-Entität gesetzt ist.",
  editor_expires: "Gültig bis (optional)",
  editor_expires_help: "Danach wird die Seite abgeblendet oder ausgeblendet, siehe „Abgelaufene Seiten“ unter Darstellung.",
  editor_color: "Seitenfarbe (optional)",
  editor_note_style: "Aussehen der Notizseiten",
  note_style_plain: "Schlichte Karte",
  note_style_sticky: "Haftnotiz",
  editor_expired_slides: "Abgelaufene Seiten",
  expired_dim: "Abblenden und markieren",
  expired_hide: "Ausblenden",
  editor_checklist: "Interaktive Checklisten",
  editor_checklist_help: "Zeilen mit „- [ ] Punkt“ werden zu Kästchen. Bei Notizen aus input_text oder text wird der Haken zurückgeschrieben, sonst merkt sich dieser Browser die Haken.",
  editor_checklist_writeback: "Haken in die Entität zurückschreiben",
  color_none: "Kartenfarbe",
  color_yellow: "Gelb",
  color_green: "Grün",
  color_blue: "Blau",
  color_pink: "Rosa",
  color_orange: "Orange",
  color_purple: "Lila",
  color_grey: "Grau",
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
  editor_add_audio: "Audio",
  editor_kind_audio: "Audio",
  editor_audio: "Audio",
  editor_audio_help: "Memo aufnehmen, Audiodatei hochladen oder eine URL bzw. media-source-ID eingeben. Aufnahmen landen im Medienordner.",
  editor_audio_url: "Audio-URL",
  editor_audio_entity: "Audio-Entität (optional)",
  editor_audio_entity_help: "Eine input_text- / text-Entität mit der Audio-Adresse. Die Karte bekommt dann einen Aufnahme-Button, der neue Memos dort speichert.",
  editor_record: "Aufnehmen",
  editor_stop: "Stopp",
  editor_upload_audio: "Audiodatei hochladen",
  editor_show_record: "Aufnahme-Button bei Audio aus einem input_text",
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
  editor_upload_max_size: "Bilder verkleinern auf",
  editor_upload_max_size_help: "Längste Kante in Pixeln vor dem Upload. 0 behält die Originalgröße.",
  editor_upload_crop: "Uploads auf das Seitenverhältnis der Karte zuschneiden",
  editor_preview: "Vorschau",
  editor_preview_help: "Auf die Vorschau oder den Button tippen, um die Animation zu sehen.",
  editor_play: "Animation abspielen",
  editor_import: "Aus einem Medienordner importieren",
  editor_import_help: "Fügt jedes Bild eines Ordners unter /media als Seite hinzu, bis zur Grenze von 10.",
  editor_import_button: "Importieren",
  editor_import_done: "{count} Bilder hinzugefügt.",
  editor_import_none: "Keine Bilder in {folder} gefunden.",
  editor_import_failed: "Import fehlgeschlagen",
  editor_drag_hint: "Ziehen zum Sortieren",
  editor_ken_burns: "Langsamer Zoom auf Bildern (Ken Burns)",
  editor_show_camera: "Kamera-Button bei Bildern aus einem input_text",
  editor_show_camera_help: "Kommt ein Bild aus einer input_text- oder text-Entität, nimmt ein Kamera-Button auf der Karte ein neues Foto auf und speichert dessen Adresse in der Entität.",
  editor_image_entity_help: "Bild einer image-, camera- oder person-Entität verwenden, oder einer input_text- / text-Entität, die eine Bildadresse enthält.",
  editor_markers: "Marker auf dem Bild",
  editor_markers_help: "In die Vorschau klicken, um einen Pin zu setzen. Einen Pin in der Liste auswählen, um ihn mit einem weiteren Klick zu verschieben.",
  editor_marker_label: "Beschriftung",
  editor_marker_icon: "Icon (optional)",
  editor_marker_entity: "Entität (optional)",
  editor_marker_remove: "Pin entfernen",
  editor_marker_none: "Noch keine Pins.",
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
.face.tinted .layer-note {
  color: var(--imagenote-note-text, var(--primary-text-color));
}
.face.tinted .note-header ha-icon,
.face.tinted .icon-button,
.face.tinted .note-meta,
.face.tinted .note-header.no-title .title {
  color: inherit;
  opacity: 0.75;
}
.face.sticky.kind-note {
  --imagenote-note-background: var(--imagenote-sticky-color, #fff3a8);
  --imagenote-note-text: #2b2b2b;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}
.face.sticky.kind-note .layer-note {
  color: var(--imagenote-note-text);
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(0, 0, 0, 0) 60%);
}
.face.sticky.kind-note .layer-note::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 26px;
  height: 26px;
  background: linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.12) 50%, rgba(0, 0, 0, 0.05));
  border-top-left-radius: 6px;
  pointer-events: none;
}
.face.sticky.kind-note .note-header ha-icon,
.face.sticky.kind-note .icon-button {
  color: inherit;
  opacity: 0.7;
}
.face.expired .layer-note,
.face.expired .layer-image img {
  filter: grayscale(0.6);
  opacity: 0.55;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  background: var(--error-color, #db4437);
  flex: none;
}
.image-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
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
.face.kind-audio .layer-audio {
  display: flex;
  flex-direction: column;
  color: var(--primary-text-color);
}

/* ---------- audio layer ---------- */
.audio-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 20px 8px;
}
.audio-play {
  appearance: none;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: var(--text-primary-color, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transition: transform 150ms ease, box-shadow 150ms ease;
  padding: 0;
}
.audio-play ha-icon {
  --mdc-icon-size: 34px;
}
.audio-play:hover {
  transform: scale(1.05);
}
.audio-play:disabled {
  opacity: 0.5;
  cursor: default;
}
.audio-progress {
  width: 100%;
  max-width: 320px;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.12);
  cursor: pointer;
  overflow: hidden;
}
.audio-bar {
  height: 100%;
  width: 0;
  background: var(--primary-color);
  border-radius: 3px;
  transition: width 200ms linear;
}
.audio-time {
  font-size: 0.8em;
  color: var(--secondary-text-color);
  font-variant-numeric: tabular-nums;
}
.audio-empty {
  text-align: center;
  color: var(--secondary-text-color);
}
.audio-empty strong {
  display: block;
  color: var(--primary-text-color);
  font-weight: 500;
}
.audio-empty small {
  font-size: 0.85em;
}
.record {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
  color: var(--primary-text-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  padding: 0;
  transition: background-color 150ms ease;
}
.record.active {
  background: var(--error-color, #db4437);
  color: #fff;
  animation: imagenote-pulse 1.2s ease-in-out infinite;
}
@keyframes imagenote-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(219, 68, 55, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(219, 68, 55, 0); }
}
.record:disabled {
  opacity: 0.5;
  cursor: default;
}
.audio-status {
  position: absolute;
  right: 54px;
  top: 16px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
  color: var(--primary-text-color);
  font-size: 0.78em;
  z-index: 3;
  max-width: calc(100% - 70px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.audio-status.error {
  background: var(--error-color, #db4437);
  color: #fff;
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
/* ---------- ken burns ---------- */
@keyframes imagenote-kenburns-a {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.12) translate(-2.5%, 1.5%); }
}
@keyframes imagenote-kenburns-b {
  from { transform: scale(1.12) translate(2%, -2%); }
  to { transform: scale(1) translate(0, 0); }
}
.stage.ken-burns .face.kind-image.current img {
  animation: imagenote-kenburns-a 22s ease-in-out infinite alternate;
  will-change: transform;
}
.stage.ken-burns .face-b.kind-image.current img {
  animation-name: imagenote-kenburns-b;
}
@media (prefers-reduced-motion: reduce) {
  .stage.ken-burns .face.kind-image.current img {
    animation: none;
  }
}

/* ---------- markers ---------- */
.markers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}
.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
.pin {
  appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--primary-color);
  color: #fff;
  font: inherit;
  font-size: 0.8em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  transition: transform 150ms ease;
}
.pin ha-icon {
  --mdc-icon-size: 16px;
}
.pin:hover,
.marker.open .pin {
  transform: scale(1.12);
}
.marker-label {
  appearance: none;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  max-width: 200px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font: inherit;
  font-size: 0.8em;
  line-height: 1.3;
  text-align: left;
  white-space: normal;
  width: max-content;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transition: opacity 150ms ease, visibility 0s linear 150ms;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.marker-label::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.8);
}
.marker.below .marker-label {
  bottom: auto;
  top: calc(100% + 8px);
}
.marker.below .marker-label::after {
  top: auto;
  bottom: 100%;
  border-top-color: transparent;
  border-bottom-color: rgba(0, 0, 0, 0.8);
}
.marker.align-left .marker-label {
  left: -13px;
  transform: none;
}
.marker.align-left .marker-label::after {
  left: 20px;
}
.marker.align-right .marker-label {
  left: auto;
  right: -13px;
  transform: none;
}
.marker.align-right .marker-label::after {
  left: auto;
  right: 14px;
  transform: none;
}
.marker.open .marker-label,
.marker:hover .marker-label {
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}

/* ---------- camera button ---------- */
.camera {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  padding: 0;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: background-color 150ms ease;
}
.camera:hover,
.camera:focus-visible {
  background: rgba(0, 0, 0, 0.65);
  outline: none;
}
.camera:disabled {
  opacity: 0.5;
  cursor: default;
}
.camera-status {
  position: absolute;
  right: 54px;
  top: 16px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.78em;
  z-index: 3;
  max-width: calc(100% - 70px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.camera-status.error {
  background: var(--error-color, #db4437);
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
.checklist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 4px 0 8px;
}
.check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 6px 4px 2px;
  border-radius: 8px;
  cursor: pointer;
  line-height: 1.4;
  transition: background-color 120ms ease;
}
.check:hover {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.05);
}
.check input {
  appearance: none;
  flex: none;
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  border: 2px solid var(--secondary-text-color);
  border-radius: 5px;
  display: inline-grid;
  place-content: center;
  cursor: pointer;
  background: transparent;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.check input::before {
  content: "";
  width: 10px;
  height: 6px;
  border-left: 2.5px solid #fff;
  border-bottom: 2.5px solid #fff;
  transform: rotate(-45deg) translate(1px, -1px) scale(0);
  transition: transform 120ms ease;
}
.check input:checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}
.check input:checked::before {
  transform: rotate(-45deg) translate(1px, -1px) scale(1);
}
.check input:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
.check.done span {
  text-decoration: line-through;
  opacity: 0.6;
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
.note-footer,
.audio-footer {
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
.note-meta,
.audio-meta {
  max-width: 55%;
  font-size: 0.75em;
  color: var(--secondary-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-meta:empty,
.audio-meta:empty {
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
  /* Arrows would sit on top of the text; notes are turned with a tap, a swipe, the dots or the keys. */
  display: none;
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

// src/upload.ts
var UploadError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
  code;
};
async function fetchWithAuth(hass, path, init) {
  if (hass.fetchWithAuth) {
    return hass.fetchWithAuth(path, init);
  }
  const token = hass.auth?.data?.access_token ?? "";
  return fetch(path, { ...init, headers: { Authorization: `Bearer ${token}` } });
}
function checkResponse(response) {
  if (response.status === 413) throw new UploadError("too large", "too_large");
  if (response.status === 401 || response.status === 403) throw new UploadError("forbidden", "forbidden");
  if (!response.ok) throw new UploadError(`${response.status} ${response.statusText}`, "http");
}
async function downscaleImage(file, maxSize, quality = 0.85, cropAspect) {
  if (!maxSize && !cropAspect || !file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const { width, height } = bitmap;
  let sx = 0;
  let sy = 0;
  let sw = width;
  let sh = height;
  if (cropAspect && cropAspect > 0) {
    if (width / height > cropAspect) {
      sw = Math.round(height * cropAspect);
      sx = Math.round((width - sw) / 2);
    } else {
      sh = Math.round(width / cropAspect);
      sy = Math.round((height - sh) / 2);
    }
  }
  const longest = Math.max(sw, sh);
  const scale = maxSize && longest > maxSize ? maxSize / longest : 1;
  if (scale === 1 && sw === width && sh === height) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const keepPng = file.type === "image/png";
  const type = keepPng ? "image/png" : "image/jpeg";
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, keepPng ? void 0 : quality));
  if (!blob) return file;
  const name = keepPng ? file.name : file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
  return new File([blob], name, { type });
}
async function uploadToImageStore(hass, file) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetchWithAuth(hass, "/api/image/upload", { method: "POST", body });
  checkResponse(response);
  const media = await response.json();
  return `/api/image/serve/${media.id}/original`;
}
async function uploadToMedia(hass, file, folder) {
  const clean = folder.trim().replace(/^\/+|\/+$/g, "");
  const target = `${MEDIA_SOURCE_PREFIX}media_source/local${clean ? `/${clean}` : ""}`;
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_") || "picture.jpg";
  const renamed = new File([file], `${Date.now()}-${safeName}`, { type: file.type });
  const body = new FormData();
  body.append("media_content_id", target);
  body.append("file", renamed);
  const response = await fetchWithAuth(hass, "/api/media_source/local_source/upload", { method: "POST", body });
  checkResponse(response);
  const result = await response.json();
  return result.media_content_id;
}
function uploadAudio(hass, blob, folder, name = "memo") {
  const ext = blob.type.includes("mp4") || blob.type.includes("aac") ? "m4a" : blob.type.includes("ogg") ? "ogg" : blob.type.includes("wav") ? "wav" : "webm";
  const file = new File([blob], `${name}.${ext}`, { type: blob.type || "audio/webm" });
  return uploadToMedia(hass, file, folder);
}
function preferredAudioType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  const Recorder = window.MediaRecorder;
  if (!Recorder?.isTypeSupported) return "";
  return candidates.find((type) => Recorder.isTypeSupported?.(type)) ?? "";
}
async function uploadPicture(hass, file, options) {
  const prepared = await downscaleImage(file, options.maxSize, options.quality, options.cropAspect);
  return options.target === "media" ? uploadToMedia(hass, prepared, options.folder) : uploadToImageStore(hass, prepared);
}

// src/notes.ts
var TASK_LINE = /^(\s*)[-*+]\s+\[([ xX])\]\s?(.*)$/;
function parseNoteBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let markdown = [];
  let items = [];
  const flushMarkdown = () => {
    if (markdown.length && markdown.some((l) => l.trim() !== "")) {
      blocks.push({ type: "markdown", text: markdown.join("\n") });
    }
    markdown = [];
  };
  const flushItems = () => {
    if (items.length) blocks.push({ type: "checklist", items });
    items = [];
  };
  lines.forEach((line, index) => {
    const match = TASK_LINE.exec(line);
    if (match) {
      flushMarkdown();
      items.push({ line: index, checked: match[2] !== " ", text: match[3] });
    } else {
      flushItems();
      markdown.push(line);
    }
  });
  flushMarkdown();
  flushItems();
  return blocks;
}
function hasChecklist(text) {
  return text.split("\n").some((line) => TASK_LINE.test(line));
}
function toggleChecklistLine(text, line, checked) {
  const lines = text.split("\n");
  const match = TASK_LINE.exec(lines[line] ?? "");
  if (!match) return text;
  lines[line] = `${match[1]}- [${checked ? "x" : " "}] ${match[3]}`;
  return lines.join("\n");
}
function hasTemplate(text) {
  return /\{\{|\{%/.test(text);
}
function parseExpiry(value) {
  const text = value.trim();
  if (!text) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 23, 59, 59, 999);
  }
  const date = new Date(text.includes("T") ? text : text.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}
function isExpired(value, now = /* @__PURE__ */ new Date()) {
  const date = parseExpiry(value);
  return date !== null && date.getTime() < now.getTime();
}
var NOTE_COLOR_PRESETS = {
  yellow: "#fff3a8",
  green: "#d4f5cd",
  blue: "#d6ebff",
  pink: "#ffd9e6",
  orange: "#ffe0b8",
  purple: "#e6dcff",
  grey: "#e9e9ee"
};
function resolveNoteColor(value) {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  return NOTE_COLOR_PRESETS[text] ?? value.trim();
}
function contrastTextColor(color) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  let r = 255;
  let g = 255;
  let b = 255;
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    r = Number.parseInt(h.slice(0, 2), 16);
    g = Number.parseInt(h.slice(2, 4), 16);
    b = Number.parseInt(h.slice(4, 6), 16);
  } else {
    const rgb = /^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(color.trim());
    if (rgb) {
      r = Number(rgb[1]);
      g = Number(rgb[2]);
      b = Number(rgb[3]);
    }
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1f1f1f" : "#ffffff";
}
function hashText(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) + hash + text.charCodeAt(i) | 0;
  }
  return (hash >>> 0).toString(36);
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
    <div class="markers"></div>
    <div class="tag image-tag hidden"></div>
    <button class="camera hidden" type="button"><ha-icon icon="mdi:camera-plus-outline"></ha-icon></button>
    <input class="camera-input" type="file" accept="image/*" capture="environment" hidden />
    <div class="camera-status hidden"></div>
  </div>
  <div class="layer layer-note">
    <div class="note-header">
      <ha-icon icon="mdi:note-text-outline"></ha-icon>
      <span class="title"></span>
      <span class="tag note-tag hidden"></span>
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
  </div>
  <div class="layer layer-audio">
    <div class="note-header">
      <ha-icon icon="mdi:microphone-outline"></ha-icon>
      <span class="title audio-title"></span>
      <span class="tag audio-tag hidden"></span>
    </div>
    <div class="audio-body">
      <div class="audio-empty hidden"><strong></strong><small></small></div>
      <button class="audio-play" type="button"><ha-icon icon="mdi:play"></ha-icon></button>
      <div class="audio-progress"><div class="audio-bar"></div></div>
      <div class="audio-time">0:00</div>
    </div>
    <div class="audio-footer"><div class="audio-meta"></div></div>
    <button class="record hidden" type="button"><ha-icon icon="mdi:microphone-plus"></ha-icon></button>
    <div class="audio-status hidden"></div>
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
function formatSeconds(total) {
  const seconds = Math.max(0, Math.floor(total));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
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
  _visible = [];
  _audio;
  _audioFace;
  _recorder;
  _recordStream;
  _recordTimer;
  _recordStart = 0;
  _templateText;
  _templateResult;
  _templateError = "";
  _templateUnsub;
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
    this._metaTimer = window.setInterval(() => {
      this._checkExpiry();
      this._renderMeta();
    }, 3e4);
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
    this._unsubscribeTemplate();
    this._stopAudio();
    this._stopRecording(true);
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
    this._unsubscribeTemplate();
    this._stopAudio();
    this._visible = this._computeVisible();
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
      const target = this._slides().findIndex((slide) => slide.kind === side);
      if (target >= 0 && target !== this._index) this._go(target, target > this._index ? 1 : -1, true);
      return;
    }
    this.goTo("next");
  }
  /** Go to a slide by index (wraps around), or one step with "next" / "prev". */
  goTo(target) {
    const config = this._config;
    if (!config || this._editing || this._tiles) return;
    const total = this._slides().length;
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
  /** The slides currently shown: expired ones drop out when expired_slides is "hide". */
  _slides() {
    return this._visible;
  }
  _computeVisible() {
    const config = this._config;
    if (!config) return [];
    const now = /* @__PURE__ */ new Date();
    const visible = config.slides.filter(
      (slide) => !(config.expired_slides === "hide" && slide.expires && isExpired(slide.expires, now))
    );
    return visible.length > 0 ? visible : config.slides.slice(0, 1);
  }
  /** Runs every half minute: hides newly expired slides and marks dimmed ones. */
  _checkExpiry() {
    const config = this._config;
    if (!config || !this._els || this._editing) return;
    const before = this._visible;
    const after = this._computeVisible();
    const same = before.length === after.length && before.every((slide, i) => slide === after[i]);
    if (!same) {
      const current = before[this._index];
      this._visible = after;
      const next = Math.max(0, after.indexOf(current));
      this._index = Math.min(next, after.length - 1);
      this._buildDots();
      this._renderSlide(this._currentFace, this._slide);
      this._afterSlideChange(false);
      return;
    }
    if (this._slide.expires) {
      this._applyExpiry(this._currentFace, this._slide);
    }
  }
  get _slide() {
    const slides = this._slides();
    return slides[Math.min(this._index, slides.length - 1)];
  }
  get _currentFace() {
    return this._els.faces[this._current];
  }
  _startIndex() {
    const config = this._config;
    if (!config) return 0;
    if (config.default_side === "note") {
      const first = this._slides().findIndex((slide) => slide.kind === "note");
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
    for (const key of ["slides", "images", "image", "image_entity", "note", "note_entity", "note_attribute", "audio", "audio_entity", "expires", "color", "markers", "title", "layout", "columns"]) {
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
        note_attribute: entry.note_attribute,
        audio: entry.audio,
        audio_entity: entry.audio_entity,
        expires: entry.expires,
        color: entry.color,
        markers: entry.markers
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
      imageTag: q(el, ".image-tag"),
      markers: q(el, ".markers"),
      camera: q(el, ".camera"),
      cameraInput: q(el, ".camera-input"),
      cameraStatus: q(el, ".camera-status"),
      noteLayer: q(el, ".layer-note"),
      noteHeader: q(el, ".note-header"),
      noteTitle: q(el, ".note-header .title"),
      noteTag: q(el, ".note-tag"),
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
      resolveToken: 0,
      entityValue: "",
      markerStates: "",
      audioLayer: q(el, ".layer-audio"),
      audioTitle: q(el, ".audio-title"),
      audioTag: q(el, ".audio-tag"),
      audioPlay: q(el, ".audio-play"),
      audioPlayIcon: q(el, ".audio-play ha-icon"),
      audioProgress: q(el, ".audio-progress"),
      audioBar: q(el, ".audio-bar"),
      audioTime: q(el, ".audio-time"),
      audioEmpty: q(el, ".audio-empty"),
      audioEmptyTitle: q(el, ".audio-empty strong"),
      audioEmptyHelp: q(el, ".audio-empty small"),
      audioMeta: q(el, ".audio-meta"),
      record: q(el, ".record"),
      recordStatus: q(el, ".audio-status"),
      audioSrc: "",
      audioFailed: false,
      audioEntityValue: ""
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
      view.camera.addEventListener("click", (ev) => {
        ev.stopPropagation();
        view.cameraInput.click();
      });
      view.cameraInput.addEventListener("change", () => {
        const file = view.cameraInput.files?.[0];
        view.cameraInput.value = "";
        if (file) void this._uploadPhoto(view, file);
      });
      view.audioPlay.addEventListener("click", (ev) => {
        ev.stopPropagation();
        void this._togglePlay(view);
      });
      view.audioProgress.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._seek(view, ev);
      });
      view.record.addEventListener("click", (ev) => {
        ev.stopPropagation();
        void this._toggleRecord(view);
      });
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
    const total = this._slides().length;
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
    els.stage.classList.toggle("ken-burns", config.ken_burns && !this._motionQuery.matches);
    els.badge.classList.toggle("hidden", !config.show_hint || this._slides().length < 2);
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
    const slide = this._slides()[index];
    if (!slide) return;
    const fromIndex = this._current;
    const toIndex = fromIndex === 0 ? 1 : 0;
    const from = els.faces[fromIndex];
    const to = els.faces[toIndex];
    const mode = animate ? this._mode() : "none";
    const duration = Number.parseFloat(getComputedStyle(this).getPropertyValue("--imagenote-duration")) || 0;
    window.clearTimeout(this._animTimer);
    this._stopAudio();
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
    const total = this._slides().length;
    els.stage.classList.toggle("kind-note", slide.kind !== "image");
    Array.from(els.dots.children).forEach((dot, i) => dot.classList.toggle("active", i === this._index));
    const next = this._slides()[(this._index + 1) % total];
    const t = (key, vars) => translate(this._lang, key, vars);
    if (next && total > 1) {
      els.badgeIcon.setAttribute(
        "icon",
        next.kind === "note" ? "mdi:note-text-outline" : next.kind === "audio" ? "mdi:microphone-outline" : "mdi:image-outline"
      );
      els.badgeLabel.textContent = t(next.kind === "note" ? "note" : next.kind === "audio" ? "audio" : "photo");
    }
    const parts = [];
    const title = slide.title || config.title;
    if (title) parts.push(title);
    if (total > 1) parts.push(t("slide", { index: this._index + 1, total }));
    if (next && total > 1) parts.push(t(next.kind === "note" ? "showNote" : next.kind === "audio" ? "showAudio" : "showPhoto"));
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
    if (!this._config || this._slides().length < 2 || this._editing) return;
    this.goTo(direction === "left" ? "next" : "prev");
  }
  // ---------------------------------------------------------------- rendering a slide into a face
  _renderSlide(view, slide) {
    const config = this._config;
    if (!config) return;
    view.el.classList.toggle("kind-image", slide.kind === "image");
    view.el.classList.toggle("kind-note", slide.kind === "note");
    view.el.classList.toggle("kind-audio", slide.kind === "audio");
    const title = slide.title || config.title;
    if (slide.kind === "audio") {
      view.audioTitle.textContent = title || translate(this._lang, "audio");
      this._applyNoteColor(view, slide);
      this._applyAudio(view, slide);
      view.record.classList.toggle("hidden", !this._recordAllowed(slide));
      view.record.title = translate(this._lang, "record");
      view.record.setAttribute("aria-label", translate(this._lang, "record"));
      this._renderAudioMeta(view, slide);
    } else if (slide.kind === "image") {
      view.titleOverlay.textContent = title;
      view.titleOverlay.classList.toggle("hidden", !(config.show_title && title));
      this._applyImage(view, slide);
      this._renderMarkers(view, slide);
      view.camera.classList.toggle("hidden", !this._cameraAllowed(slide));
      view.camera.title = translate(this._lang, "takePhoto");
      view.camera.setAttribute("aria-label", translate(this._lang, "takePhoto"));
    } else {
      view.noteTitle.textContent = title || translate(this._lang, "note");
      view.noteHeader.classList.toggle("no-title", !title);
      this._applyNoteColor(view, slide);
      this._ensureTemplate(slide);
      const source = this._noteSource(slide);
      if (view === this._currentFace) this._lastNote = source;
      view.editButton.classList.toggle("hidden", !source.editable);
      this._renderNote(view, source);
      this._renderMetaFor(view, source);
    }
    this._applyExpiry(view, slide);
  }
  _applyNoteColor(view, slide) {
    const config = this._config;
    const color = resolveNoteColor(slide.color);
    view.el.classList.toggle("sticky", config?.note_style === "sticky");
    if (color) {
      view.el.style.setProperty("--imagenote-note-background", color);
      view.el.style.setProperty("--imagenote-note-text", contrastTextColor(color));
      view.el.classList.add("tinted");
    } else {
      view.el.style.removeProperty("--imagenote-note-background");
      view.el.style.removeProperty("--imagenote-note-text");
      view.el.classList.remove("tinted");
    }
  }
  _applyExpiry(view, slide) {
    const expired = Boolean(slide.expires) && isExpired(slide.expires);
    const dim = expired && this._config?.expired_slides !== "hide";
    view.el.classList.toggle("expired", dim);
    const label = dim ? translate(this._lang, "expired") : "";
    view.noteTag.textContent = label;
    view.noteTag.classList.toggle("hidden", !dim);
    view.audioTag.textContent = label;
    view.audioTag.classList.toggle("hidden", !dim);
    view.imageTag.textContent = label;
    view.imageTag.classList.toggle("hidden", !dim);
  }
  // ---------------------------------------------------------------- templates
  /** Notes with {{ }} or {% %} are rendered by Home Assistant and follow state changes. */
  _ensureTemplate(slide) {
    const raw = this._rawNoteText(slide);
    if (!hasTemplate(raw) || !this._hass?.connection) {
      if (this._templateText !== void 0) this._unsubscribeTemplate();
      return;
    }
    if (raw === this._templateText) return;
    this._unsubscribeTemplate();
    this._templateText = raw;
    this._templateResult = void 0;
    this._templateError = "";
    const connection = this._hass.connection;
    this._templateUnsub = connection.subscribeMessage(
      (message) => {
        if (this._templateText !== raw) return;
        if (message.error !== void 0) {
          this._templateError = String(message.error);
        } else {
          this._templateError = "";
          this._templateResult = typeof message.result === "string" ? message.result : JSON.stringify(message.result);
        }
        this._lastNote = void 0;
        this._applyHass();
      },
      { type: "render_template", template: raw, timeout: 3, report_errors: true }
    );
    this._templateUnsub.catch(() => {
      this._templateError = "subscribe failed";
    });
  }
  _unsubscribeTemplate() {
    const pending = this._templateUnsub;
    this._templateUnsub = void 0;
    this._templateText = void 0;
    this._templateResult = void 0;
    this._templateError = "";
    if (pending) {
      pending.then((unsub) => unsub()).catch(() => void 0);
    }
  }
  _rawNoteText(slide) {
    if (!slide.note_entity) return slide.note;
    const entity = this._hass?.states[slide.note_entity];
    if (!entity) return "";
    if (slide.note_attribute) {
      const raw = entity.attributes[slide.note_attribute];
      return raw === void 0 || raw === null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw);
    }
    return entity.state === "unknown" || entity.state === "unavailable" ? "" : entity.state;
  }
  // ---------------------------------------------------------------- picture
  /** The picture address an entity provides: entity_picture, or the state of an input_text / text. */
  _imageSourceFromEntity(slide) {
    if (!slide.image_entity || !this._hass) return void 0;
    const entity = this._hass.states[slide.image_entity];
    if (!entity) return void 0;
    const domain = slide.image_entity.split(".")[0];
    if (IMAGE_URL_ENTITY_DOMAINS.includes(domain)) {
      const value = entity.state.trim();
      return value && value !== "unknown" && value !== "unavailable" ? value : void 0;
    }
    const picture = entity.attributes.entity_picture;
    if (typeof picture !== "string" || !picture) return void 0;
    if (domain === "image" || domain === "camera") {
      const join = picture.includes("?") ? "&" : "?";
      return `${picture}${join}state=${encodeURIComponent(entity.state)}`;
    }
    return picture;
  }
  _cameraAllowed(slide) {
    if (!this._config?.show_camera || !slide.image_entity || !this._hass) return false;
    return IMAGE_URL_ENTITY_DOMAINS.includes(slide.image_entity.split(".")[0]);
  }
  _applyImage(view, slide) {
    const token = ++view.resolveToken;
    this._mediaPending = false;
    const image = slide.image_entity ? this._imageSourceFromEntity(slide) : slide.image;
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
  // ---------------------------------------------------------------- markers
  _renderMarkers(view, slide) {
    view.markers.replaceChildren();
    view.markerStates = slide.markers.map((m) => m.entity ? this._hass?.states[m.entity]?.state ?? "" : "").join("|");
    slide.markers.forEach((marker, index) => {
      const pin = document.createElement("div");
      pin.className = "marker";
      pin.style.left = `${marker.x}%`;
      pin.style.top = `${marker.y}%`;
      if (marker.y < 22) pin.classList.add("below");
      if (marker.x > 70) pin.classList.add("align-right");
      else if (marker.x < 30) pin.classList.add("align-left");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pin";
      if (marker.icon) {
        const icon = document.createElement("ha-icon");
        icon.setAttribute("icon", marker.icon);
        button.append(icon);
      } else {
        button.textContent = String(index + 1);
      }
      const entity = marker.entity ? this._hass?.states[marker.entity] : void 0;
      const parts = [];
      if (marker.label) parts.push(marker.label);
      if (marker.entity) {
        const name = entity?.attributes.friendly_name ?? marker.entity;
        const unit = entity?.attributes.unit_of_measurement ?? "";
        parts.push(entity ? `${marker.label ? "" : `${name}: `}${entity.state}${unit ? ` ${unit}` : ""}` : name);
      }
      const text = parts.join(" · ");
      button.setAttribute("aria-label", text || `${index + 1}`);
      button.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const open = pin.classList.contains("open");
        view.markers.querySelectorAll(".marker.open").forEach((el) => el.classList.remove("open"));
        if (!open && text) pin.classList.add("open");
      });
      pin.append(button);
      if (text) {
        const bubble = document.createElement("button");
        bubble.type = "button";
        bubble.className = "marker-label";
        bubble.textContent = text;
        bubble.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (marker.entity) {
            this.dispatchEvent(
              new CustomEvent("hass-more-info", { detail: { entityId: marker.entity }, bubbles: true, composed: true })
            );
          } else {
            pin.classList.remove("open");
          }
        });
        pin.append(bubble);
      }
      view.markers.append(pin);
    });
  }
  // ---------------------------------------------------------------- camera
  /** Takes or picks a photo, uploads it and stores its address in the slide's input_text. */
  async _uploadPhoto(view, file) {
    const config = this._config;
    const slide = this._slide;
    const hass = this._hass;
    if (!config || !hass || !this._cameraAllowed(slide)) return;
    const t = (key) => translate(this._lang, key);
    view.cameraStatus.textContent = t("uploading");
    view.cameraStatus.classList.remove("hidden", "error");
    view.camera.disabled = true;
    try {
      const value = await uploadPicture(hass, file, {
        target: config.upload_target,
        folder: config.upload_folder,
        maxSize: config.upload_max_size,
        cropAspect: config.upload_crop ? parseAspectRatio(config.aspect_ratio) ?? void 0 : void 0
      });
      const domain = slide.image_entity.split(".")[0];
      await hass.callService(domain, "set_value", { entity_id: slide.image_entity, value });
      view.cameraStatus.classList.add("hidden");
    } catch (err) {
      const code = err instanceof UploadError ? err.code : "network";
      const message = code === "too_large" ? t("uploadTooLarge") : code === "forbidden" ? t("uploadForbidden") : err?.message ?? "";
      view.cameraStatus.textContent = `${t("uploadFailed")}${message ? `: ${message}` : ""}`;
      view.cameraStatus.classList.add("error");
      window.setTimeout(() => view.cameraStatus.classList.add("hidden"), 6e3);
    } finally {
      view.camera.disabled = false;
    }
  }
  // ---------------------------------------------------------------- audio
  _audioSourceFromEntity(slide) {
    if (!slide.audio_entity || !this._hass) return void 0;
    const entity = this._hass.states[slide.audio_entity];
    if (!entity) return void 0;
    const value = entity.state.trim();
    return value && value !== "unknown" && value !== "unavailable" ? value : void 0;
  }
  _recordAllowed(slide) {
    if (!this._config?.show_record || !slide.audio_entity || !this._hass) return false;
    return IMAGE_URL_ENTITY_DOMAINS.includes(slide.audio_entity.split(".")[0]);
  }
  _applyAudio(view, slide) {
    const token = ++view.resolveToken;
    const source = slide.audio_entity ? this._audioSourceFromEntity(slide) : slide.audio;
    if (!source) {
      this._setAudio(view, "", false);
      return;
    }
    const mediaId = typeof source === "string" ? isMediaSourceId(source) ? source : void 0 : source.media_content_id;
    if (!mediaId) {
      this._setAudio(view, source, false);
      return;
    }
    const cached = this._resolved.get(mediaId);
    if (cached && !cached.failed && cached.expiresAt > Date.now()) {
      this._setAudio(view, cached.url, false);
      return;
    }
    if (!this._hass) {
      this._setAudio(view, "", false);
      return;
    }
    void this._hass.callWS({ type: "media_source/resolve_media", media_content_id: mediaId, expires: MEDIA_EXPIRES_SECONDS }).then((result) => {
      this._resolved.set(mediaId, { url: result.url, failed: false, expiresAt: Date.now() + MEDIA_REFRESH_MS });
      if (token !== view.resolveToken) return;
      this._setAudio(view, result.url, false);
    }).catch(() => {
      if (token !== view.resolveToken) return;
      this._setAudio(view, "", true);
    });
  }
  _setAudio(view, src, failed) {
    if (this._audioFace === view && this._audio && src !== view.audioSrc) this._stopAudio();
    view.audioSrc = src;
    view.audioFailed = failed;
    const t = (key) => translate(this._lang, key);
    const has = Boolean(src) && !failed;
    view.audioEmpty.classList.toggle("hidden", has);
    view.audioPlay.classList.toggle("hidden", !has);
    view.audioProgress.classList.toggle("hidden", !has);
    view.audioTime.classList.toggle("hidden", !has);
    view.audioEmptyTitle.textContent = failed ? t("audioError") : t("noAudio");
    view.audioEmptyHelp.textContent = failed ? "" : t("noAudioHelp");
    view.audioBar.style.width = "0%";
    view.audioTime.textContent = "0:00";
    view.audioPlayIcon.setAttribute("icon", "mdi:play");
  }
  _renderAudioMeta(view, slide) {
    view.audioMeta.textContent = "";
    if (!slide.audio_entity || !this._config?.show_updated) return;
    const entity = this._hass?.states[slide.audio_entity];
    if (entity?.last_changed) {
      view.audioMeta.textContent = translate(this._lang, "updated", {
        time: formatRelativeTime(new Date(entity.last_changed), this._lang)
      });
    }
  }
  _ensureAudio() {
    if (this._audio) return this._audio;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.addEventListener("timeupdate", () => this._updateAudioTime());
    audio.addEventListener("durationchange", () => this._updateAudioTime());
    audio.addEventListener("ended", () => {
      this._audioFace?.audioPlayIcon.setAttribute("icon", "mdi:play");
      this._updateAudioTime();
    });
    audio.addEventListener("pause", () => this._audioFace?.audioPlayIcon.setAttribute("icon", "mdi:play"));
    audio.addEventListener("play", () => this._audioFace?.audioPlayIcon.setAttribute("icon", "mdi:pause"));
    audio.addEventListener("error", () => {
      if (this._audioFace) this._setAudio(this._audioFace, this._audioFace.audioSrc, true);
    });
    this._audio = audio;
    return audio;
  }
  async _togglePlay(view) {
    if (!view.audioSrc) return;
    const audio = this._ensureAudio();
    if (this._audioFace !== view || audio.getAttribute("src") !== view.audioSrc) {
      audio.pause();
      this._audioFace = view;
      audio.setAttribute("src", view.audioSrc);
      audio.load();
    }
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch (err) {
      console.warn("ImageNote: playback failed", err);
    }
  }
  _seek(view, ev) {
    const audio = this._audio;
    if (!audio || this._audioFace !== view || !Number.isFinite(audio.duration)) return;
    const rect = view.audioProgress.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    this._updateAudioTime();
  }
  _updateAudioTime() {
    const audio = this._audio;
    const view = this._audioFace;
    if (!audio || !view) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const ratio = duration > 0 ? audio.currentTime / duration : 0;
    view.audioBar.style.width = `${Math.round(ratio * 1e3) / 10}%`;
    view.audioTime.textContent = duration > 0 ? `${formatSeconds(audio.currentTime)} / ${formatSeconds(duration)}` : formatSeconds(audio.currentTime);
  }
  _stopAudio() {
    const audio = this._audio;
    if (!audio) return;
    audio.pause();
    if (this._audioFace) {
      this._audioFace.audioPlayIcon.setAttribute("icon", "mdi:play");
      this._audioFace.audioBar.style.width = "0%";
    }
    try {
      audio.currentTime = 0;
    } catch {
    }
  }
  /** Records a memo with the microphone, uploads it to the media folder and stores it in the audio entity. */
  async _toggleRecord(view) {
    if (this._recorder) {
      this._stopRecording(false);
      return;
    }
    const slide = this._slide;
    const hass = this._hass;
    const config = this._config;
    if (!config || !hass || !this._recordAllowed(slide)) return;
    const t = (key, vars) => translate(this._lang, key, vars);
    const showStatus = (text, error = false) => {
      view.recordStatus.textContent = text;
      view.recordStatus.classList.toggle("error", error);
      view.recordStatus.classList.remove("hidden");
    };
    const Recorder = window.MediaRecorder;
    if (!Recorder || !navigator.mediaDevices?.getUserMedia) {
      showStatus(t("micUnsupported"), true);
      window.setTimeout(() => view.recordStatus.classList.add("hidden"), 5e3);
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      showStatus(t("micDenied"), true);
      window.setTimeout(() => view.recordStatus.classList.add("hidden"), 5e3);
      return;
    }
    this._stopAudio();
    const type = preferredAudioType();
    const recorder = type ? new Recorder(stream, { mimeType: type }) : new Recorder(stream);
    const chunks = [];
    recorder.addEventListener("dataavailable", (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      window.clearInterval(this._recordTimer);
      this._recordTimer = void 0;
      this._recorder = void 0;
      this._recordStream = void 0;
      view.record.classList.remove("active");
      view.record.title = t("record");
      if (!chunks.length) {
        view.recordStatus.classList.add("hidden");
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || type || "audio/webm" });
      showStatus(t("uploading"));
      view.record.disabled = true;
      void uploadAudio(hass, blob, config.upload_folder, `memo-${Date.now()}`).then(async (value) => {
        const domain = slide.audio_entity.split(".")[0];
        await hass.callService(domain, "set_value", { entity_id: slide.audio_entity, value });
        view.recordStatus.classList.add("hidden");
      }).catch((err) => {
        const code = err instanceof UploadError ? err.code : "network";
        const message = code === "too_large" ? t("uploadTooLarge") : code === "forbidden" ? t("uploadForbidden") : err?.message ?? "";
        showStatus(`${t("uploadFailed")}${message ? `: ${message}` : ""}`, true);
        window.setTimeout(() => view.recordStatus.classList.add("hidden"), 6e3);
      }).finally(() => {
        view.record.disabled = false;
      });
    });
    this._recorder = recorder;
    this._recordStream = stream;
    this._recordStart = Date.now();
    recorder.start();
    view.record.classList.add("active");
    view.record.title = t("stopRecording");
    showStatus(t("recording", { seconds: 0 }));
    this._recordTimer = window.setInterval(() => {
      const seconds = Math.round((Date.now() - this._recordStart) / 1e3);
      showStatus(t("recording", { seconds }));
      if (seconds >= MAX_RECORDING_SECONDS) this._stopRecording(false);
    }, 500);
  }
  _stopRecording(discard) {
    const recorder = this._recorder;
    if (!recorder) return;
    if (discard) {
      this._recorder = void 0;
      window.clearInterval(this._recordTimer);
      this._recordStream?.getTracks().forEach((track) => track.stop());
      this._recordStream = void 0;
      return;
    }
    if (recorder.state !== "inactive") recorder.stop();
  }
  // ---------------------------------------------------------------- note
  _noteSource(slide) {
    const config = this._config;
    const empty = {
      text: "",
      raw: "",
      templated: false,
      editable: false,
      error: "",
      max: null,
      domain: "",
      changed: "",
      entityId: ""
    };
    if (!config) return empty;
    if (!slide.note_entity) {
      return this._withTemplate({ ...empty, text: slide.note, raw: slide.note });
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
    return this._withTemplate({
      text,
      raw: text,
      templated: false,
      editable: !attr && NOTE_ENTITY_DOMAINS.includes(domain),
      error: "",
      max,
      domain,
      changed: config.show_updated ? entity.last_changed ?? "" : "",
      entityId: slide.note_entity
    });
  }
  _withTemplate(source) {
    if (!hasTemplate(source.raw)) return source;
    if (this._templateText === source.raw) {
      if (this._templateError) {
        return { ...source, templated: true, error: `${translate(this._lang, "templateError")}: ${this._templateError}` };
      }
      if (this._templateResult !== void 0) {
        return { ...source, templated: true, text: this._templateResult };
      }
    }
    return { ...source, templated: true };
  }
  /** Reacts to state changes for the slide currently shown. */
  _applyHass() {
    const els = this._els;
    if (!els || !this._config) return;
    const slide = this._slide;
    const view = this._currentFace;
    if (slide.kind === "audio") {
      if (slide.audio_entity) {
        const value = this._audioSourceFromEntity(slide) ?? "";
        if (value !== view.audioEntityValue) {
          view.audioEntityValue = value;
          this._applyAudio(view, slide);
        }
        view.record.classList.toggle("hidden", !this._recordAllowed(slide));
        this._renderAudioMeta(view, slide);
      }
      return;
    }
    if (slide.kind === "image") {
      if (slide.image_entity) {
        const value = this._imageSourceFromEntity(slide) ?? "";
        if (value !== view.entityValue) {
          view.entityValue = value;
          this._applyImage(view, slide);
        }
        view.camera.classList.toggle("hidden", !this._cameraAllowed(slide));
      }
      if (slide.markers.some((marker) => marker.entity)) {
        const key = slide.markers.map((m) => m.entity ? this._hass?.states[m.entity]?.state ?? "" : "").join("|");
        if (key !== view.markerStates) this._renderMarkers(view, slide);
      }
      return;
    }
    this._ensureTemplate(slide);
    const source = this._noteSource(slide);
    const last = this._lastNote;
    if (last && last.text === source.text && last.raw === source.raw && last.editable === source.editable && last.error === source.error && last.max === source.max && last.changed === source.changed && last.entityId === source.entityId) {
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
    view.noteMeta.textContent = "";
    if (this._editing) return;
    const parts = [];
    if (source.changed) {
      parts.push(translate(this._lang, "updated", { time: formatRelativeTime(new Date(source.changed), this._lang) }));
    }
    const slide = this._slide;
    if (slide?.expires && !isExpired(slide.expires)) {
      const date = parseExpiry(slide.expires);
      if (date) {
        const formatted = new Intl.DateTimeFormat(this._lang, { day: "numeric", month: "short" }).format(date);
        parts.push(translate(this._lang, "expiresOn", { date: formatted }));
      }
    }
    view.noteMeta.textContent = parts.join(" · ");
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
    if (this._config?.checklist && hasChecklist(source.text)) {
      const overrides = this._localChecks(source);
      for (const block of parseNoteBlocks(source.text)) {
        if (block.type === "markdown") {
          body.append(this._markdownElement(block.text));
          continue;
        }
        const list = document.createElement("div");
        list.className = "checklist";
        for (const item of block.items) {
          const label = document.createElement("label");
          label.className = "check";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = overrides?.[item.line] ?? item.checked;
          const text = document.createElement("span");
          text.textContent = item.text;
          label.classList.toggle("done", input.checked);
          input.addEventListener("change", () => {
            label.classList.toggle("done", input.checked);
            void this._toggleCheck(view, source, item.line, input.checked);
          });
          label.append(input, text);
          list.append(label);
        }
        body.append(list);
      }
      return;
    }
    body.append(this._markdownElement(source.text));
  }
  _markdownElement(text) {
    if (this._markdownReady) {
      const md = document.createElement("ha-markdown");
      md.setAttribute("breaks", "");
      md.breaks = true;
      md.content = text;
      return md;
    }
    const div = document.createElement("div");
    div.className = "note-text";
    div.textContent = text;
    return div;
  }
  // ---------------------------------------------------------------- checklists
  _canWriteBack(source) {
    return Boolean(this._config?.checklist_writeback) && source.editable && !source.templated && Boolean(this._hass);
  }
  _checkKey(source) {
    return `${CHECKLIST_STORAGE_PREFIX}${hashText(source.text)}`;
  }
  /** Ticks remembered in this browser for notes that cannot be written back. */
  _localChecks(source) {
    if (this._canWriteBack(source)) return void 0;
    try {
      const raw = window.localStorage.getItem(this._checkKey(source));
      return raw ? JSON.parse(raw) : void 0;
    } catch {
      return void 0;
    }
  }
  async _toggleCheck(view, source, line, checked) {
    if (this._canWriteBack(source) && this._hass) {
      const value = toggleChecklistLine(source.raw, line, checked);
      const optimistic = { ...source, raw: value, text: value };
      this._lastNote = optimistic;
      try {
        await this._hass.callService(source.domain, "set_value", { entity_id: source.entityId, value });
      } catch (err) {
        console.warn("ImageNote: could not save the checklist", err);
        this._lastNote = void 0;
        this._applyHass();
      }
      return;
    }
    try {
      const key = this._checkKey(source);
      const current = this._localChecks(source) ?? {};
      current[line] = checked;
      window.localStorage.setItem(key, JSON.stringify(current));
    } catch {
    }
    void view;
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
      if (node instanceof HTMLInputElement || node instanceof HTMLLabelElement) return false;
      if (node instanceof HTMLElement && node.classList.contains("audio-progress")) return false;
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
    if (seconds > 0 && this._slides().length > 1) {
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
var EDITOR_DEFAULTS = {};
var PAGE_KEYS = ["kind", "title", "image", "image_entity", "note", "note_entity", "note_attribute", "expires", "color", "markers", "audio", "audio_entity"];
var LIST_KEYS = ["slides", "images"];
var TEMPLATE2 = `
<div class="pages">
  <div class="pages-label"></div>
  <div class="pages-help"></div>
  <div class="chips"></div>
  <div class="chips add-row"></div>
  <div class="status max-note"></div>
  <div class="import-row">
    <input class="import-folder" type="text" />
    <button class="btn import" type="button"><ha-icon icon="mdi:folder-image"></ha-icon><span></span></button>
  </div>
  <div class="status import-status"></div>
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
<div class="markers-editor hidden">
  <div class="picture-label markers-label"></div>
  <div class="picture-help markers-help"></div>
  <div class="marker-canvas"><img alt="" draggable="false" /><div class="pins"></div></div>
  <div class="marker-list"></div>
</div>
<div class="audio-editor hidden">
  <div class="picture-label audio-label"></div>
  <div class="picture-help audio-help"></div>
  <div class="buttons">
    <button class="btn primary record-btn" type="button"><ha-icon icon="mdi:microphone"></ha-icon><span></span></button>
    <button class="btn upload-audio" type="button"><ha-icon icon="mdi:upload"></ha-icon><span></span></button>
    <input class="audio-file" type="file" accept="audio/*" hidden />
  </div>
  <div class="status audio-editor-status"></div>
  <audio class="audio-preview" controls preload="metadata"></audio>
</div>
<ha-form class="page-form"></ha-form>
<div class="divider"></div>
<ha-form class="card-form"></ha-form>
<div class="divider"></div>
<div class="preview-section">
  <div class="picture-label preview-label"></div>
  <div class="picture-help preview-help"></div>
  <div class="preview-card"></div>
  <div class="buttons"><button class="btn primary play" type="button"><ha-icon icon="mdi:play"></ha-icon><span></span></button></div>
</div>
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
.chip[draggable="true"] {
  cursor: grab;
}
.chip.dragging {
  opacity: 0.4;
}
.chip.drop-target {
  outline: 2px dashed var(--primary-color);
  outline-offset: 2px;
}
.import-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.import-row input {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 0.9em;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  color: var(--primary-text-color);
  outline: none;
}
.import-row input:focus {
  border-color: var(--primary-color);
}
.preview-section {
  margin-bottom: 8px;
}
.preview-card {
  margin: 10px 0;
  max-width: 420px;
}
.preview-card imagenote-card {
  display: block;
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
.markers-editor {
  margin-bottom: 16px;
}
.marker-canvas {
  position: relative;
  margin-top: 10px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--secondary-background-color, #f2f2f2);
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  cursor: crosshair;
  min-height: 80px;
}
.marker-canvas img {
  display: block;
  width: 100%;
  height: auto;
}
.marker-canvas img:not([src]) {
  display: none;
}
.marker-canvas .pins {
  position: absolute;
  inset: 0;
}
.marker-canvas .pin {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--primary-color);
  color: #fff;
  font: inherit;
  font-size: 0.75em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
}
.marker-canvas .pin.selected {
  background: var(--error-color, #db4437);
  transform: translate(-50%, -50%) scale(1.15);
}
.marker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
.marker-row {
  display: grid;
  grid-template-columns: 28px 1fr 1fr 1fr 36px;
  gap: 8px;
  align-items: center;
}
.marker-row.selected .marker-number {
  background: var(--error-color, #db4437);
}
.marker-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  font-size: 0.75em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  padding: 0;
}
.marker-row input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font: inherit;
  font-size: 0.9em;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  color: var(--primary-text-color);
  outline: none;
}
.marker-row input:focus {
  border-color: var(--primary-color);
}
.marker-row .icon-button {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--secondary-text-color);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.marker-empty {
  font-size: 0.85em;
  color: var(--secondary-text-color);
  margin-top: 8px;
}
@media (max-width: 480px) {
  .marker-row { grid-template-columns: 28px 1fr 36px; }
  .marker-row input.marker-icon, .marker-row input.marker-entity { grid-column: 2; }
}
.audio-editor {
  margin-bottom: 16px;
}
.audio-preview {
  display: block;
  width: 100%;
  margin-top: 8px;
}
.audio-preview:not([src]) {
  display: none;
}
.record-btn.active {
  background: var(--error-color, #db4437);
  border-color: var(--error-color, #db4437);
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
  _selectedMarker = -1;
  _canvasImg;
  _previewCard;
  _dragIndex = -1;
  _importing = false;
  _recorder;
  _recordTimer;
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
    if (this._previewCard) this._previewCard.hass = hass;
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
    const audio = hasAudio(page) || page.kind === "audio";
    const parts = [picture, note, audio].filter(Boolean).length;
    if (parts > 1) return "both";
    if (audio) return "audio";
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
    pages.push(kind === "image" ? {} : { kind });
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
  _reorder(from, to) {
    const pages = this._pages().map((p) => ({ ...p }));
    if (from < 0 || from >= pages.length || to < 0 || to >= pages.length) return;
    const [moved] = pages.splice(from, 1);
    pages.splice(to, 0, moved);
    this._pageIndex = to;
    this._emit(this._withPages(this._config ?? { type: "" }, pages));
  }
  /** Adds every picture of a folder below /media as an entry, up to the slide limit. */
  async _importFolder() {
    const hass = this._hass;
    const input = this._root.querySelector(".import-folder");
    const status = this._root.querySelector(".import-status");
    if (!hass || !input || this._importing) return;
    const t = (key, vars) => translate(this._lang, key, vars);
    const folder = input.value.trim().replace(/^\/+|\/+$/g, "");
    const id = folder.startsWith(MEDIA_SOURCE_PREFIX) ? folder : `${MEDIA_SOURCE_PREFIX}media_source/local${folder ? `/${folder}` : ""}`;
    this._importing = true;
    if (status) {
      status.textContent = t("editor_uploading");
      status.classList.remove("error");
    }
    try {
      const result = await hass.callWS({
        type: "media_source/browse_media",
        media_content_id: id
      });
      const pictures = (result.children ?? []).filter(
        (child) => child.media_class === "image" || (child.media_content_type ?? "").startsWith("image/")
      );
      const pages = this._pages().map((p) => ({ ...p }));
      let added = 0;
      for (const child of pictures) {
        if (this._slideCount(pages) >= MAX_SLIDES) break;
        pages.push({ image: child.media_content_id });
        added++;
      }
      if (added) {
        this._pageIndex = pages.length - 1;
        this._emit(this._withPages(this._config ?? { type: "" }, pages));
      }
      if (status) status.textContent = added ? t("editor_import_done", { count: added }) : t("editor_import_none", { folder: folder || "/media" });
    } catch (err) {
      if (status) {
        status.textContent = `${t("editor_import_failed")}: ${err instanceof Error ? err.message : String(err)}`;
        status.classList.add("error");
      }
    } finally {
      this._importing = false;
      const button = this._root.querySelector(".import");
      if (button) button.disabled = false;
    }
  }
  // ---------------------------------------------------------------- audio
  _renderAudioEditor(show) {
    const section = this._root.querySelector(".audio-editor");
    if (!section) return;
    section.classList.toggle("hidden", !show);
    if (!show) return;
    const t = (key) => translate(this._lang, key);
    const setText = (selector, text) => {
      const el = section.querySelector(selector);
      if (el) el.textContent = text;
    };
    setText(".audio-label", t("editor_audio"));
    setText(".audio-help", t("editor_audio_help"));
    setText(".record-btn span", t(this._recorder ? "editor_stop" : "editor_record"));
    setText(".upload-audio span", t("editor_upload_audio"));
    section.querySelector(".record-btn")?.classList.toggle("active", Boolean(this._recorder));
    this._updateAudioPreview();
  }
  _updateAudioPreview() {
    const audio = this._root.querySelector(".audio-preview");
    if (!audio) return;
    const page = this._page();
    let source;
    if (page.audio_entity && this._hass) {
      const entity = this._hass.states[page.audio_entity];
      source = entity && entity.state !== "unknown" ? entity.state : "";
    } else {
      source = typeof page.audio === "object" && page.audio !== null ? page.audio.media_content_id : page.audio;
    }
    if (!source) {
      audio.removeAttribute("src");
      return;
    }
    if (!source.startsWith(MEDIA_SOURCE_PREFIX)) {
      if (audio.getAttribute("src") !== source) audio.src = source;
      return;
    }
    if (!this._hass) return;
    const wanted = source;
    void this._hass.callWS({ type: "media_source/resolve_media", media_content_id: wanted, expires: MEDIA_EXPIRES_SECONDS }).then((result) => {
      if (audio.dataset.mediaId !== wanted) {
        audio.dataset.mediaId = wanted;
        audio.src = result.url;
      }
    }).catch(() => audio.removeAttribute("src"));
  }
  _setAudioStatus(text, isError = false) {
    const status = this._root.querySelector(".audio-editor-status");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("error", isError);
  }
  async _uploadAudioFile(file, name = "memo") {
    const hass = this._hass;
    if (!hass) return;
    const t = (key) => translate(this._lang, key);
    this._setAudioStatus(t("editor_uploading"));
    try {
      const folder = this._config?.upload_folder ?? DEFAULTS.upload_folder;
      const value = await uploadAudio(hass, file, folder, name);
      const page = { ...this._page(), audio: value };
      delete page.kind;
      this._emit(this._withPage(this._pageIndex, page));
      this._setAudioStatus(t("editor_upload_done"));
    } catch (err) {
      const code = err instanceof UploadError ? err.code : "network";
      const message = code === "too_large" ? t("editor_upload_too_large") : code === "forbidden" ? t("editor_upload_forbidden") : err instanceof Error ? err.message : String(err);
      this._setAudioStatus(`${t("editor_upload_failed")}: ${message}`, true);
    }
  }
  async _toggleRecord() {
    const t = (key, vars) => translate(this._lang, key, vars);
    if (this._recorder) {
      if (this._recorder.state !== "inactive") this._recorder.stop();
      return;
    }
    const Recorder = window.MediaRecorder;
    if (!Recorder || !navigator.mediaDevices?.getUserMedia) {
      this._setAudioStatus(t("micUnsupported"), true);
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this._setAudioStatus(t("micDenied"), true);
      return;
    }
    const type = preferredAudioType();
    const recorder = type ? new Recorder(stream, { mimeType: type }) : new Recorder(stream);
    const chunks = [];
    const started = Date.now();
    recorder.addEventListener("dataavailable", (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      window.clearInterval(this._recordTimer);
      this._recorder = void 0;
      this._renderAudioEditor(true);
      if (chunks.length) {
        void this._uploadAudioFile(new Blob(chunks, { type: recorder.mimeType || type || "audio/webm" }), `memo-${Date.now()}`);
      }
    });
    this._recorder = recorder;
    recorder.start();
    this._renderAudioEditor(true);
    this._recordTimer = window.setInterval(() => {
      const seconds = Math.round((Date.now() - started) / 1e3);
      this._setAudioStatus(t("recording", { seconds }));
      if (seconds >= 180 && this._recorder?.state !== "inactive") this._recorder?.stop();
    }, 500);
  }
  _updatePreviewCard() {
    const card = this._previewCard;
    if (!card || !this._config) return;
    try {
      card.setConfig({ ...this._config, type: this._config.type || `custom:${CARD_TYPE}` });
      if (this._hass) card.hass = this._hass;
    } catch {
    }
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
    this._canvasImg = q(".marker-canvas img");
    this._root.querySelector(".marker-canvas")?.addEventListener("click", (ev) => this._onCanvasClick(ev));
    this._root.querySelector(".import")?.addEventListener("click", () => void this._importFolder());
    this._root.querySelector(".import-folder")?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") void this._importFolder();
    });
    const preview = this._root.querySelector(".preview-card");
    if (preview && customElements.get(CARD_TYPE)) {
      this._previewCard = document.createElement(CARD_TYPE);
      if (this._previewCard) preview.append(this._previewCard);
    }
    this._root.querySelector(".play")?.addEventListener("click", () => this._previewCard?.flip());
    this._root.querySelector(".record-btn")?.addEventListener("click", () => void this._toggleRecord());
    const audioFile = this._root.querySelector(".audio-file");
    this._root.querySelector(".upload-audio")?.addEventListener("click", () => audioFile?.click());
    audioFile?.addEventListener("change", () => {
      const file = audioFile.files?.[0];
      audioFile.value = "";
      if (file) void this._uploadAudioFile(file);
    });
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
        icon.setAttribute(
          "icon",
          kind === "note" ? "mdi:note-text-outline" : kind === "audio" ? "mdi:microphone-outline" : kind === "both" ? "mdi:image-text" : "mdi:image-outline"
        );
        const label = document.createElement("span");
        label.textContent = `${index + 1} · ${t(`editor_kind_${kind}`)}`;
        chip.append(icon, label);
        chip.title = t("editor_drag_hint");
        chip.addEventListener("click", () => this._selectPage(index));
        chip.draggable = true;
        chip.addEventListener("dragstart", (ev) => {
          this._dragIndex = index;
          chip.classList.add("dragging");
          ev.dataTransfer?.setData("text/plain", String(index));
          if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "move";
        });
        chip.addEventListener("dragend", () => {
          this._dragIndex = -1;
          chip.classList.remove("dragging");
        });
        chip.addEventListener("dragover", (ev) => {
          if (this._dragIndex < 0 || this._dragIndex === index) return;
          ev.preventDefault();
          chip.classList.add("drop-target");
        });
        chip.addEventListener("dragleave", () => chip.classList.remove("drop-target"));
        chip.addEventListener("drop", (ev) => {
          ev.preventDefault();
          chip.classList.remove("drop-target");
          const from = this._dragIndex >= 0 ? this._dragIndex : Number(ev.dataTransfer?.getData("text/plain"));
          this._dragIndex = -1;
          if (!Number.isInteger(from) || from === index) return;
          this._reorder(from, index);
        });
        this._chips?.append(chip);
      });
    }
    const addRow = this._root.querySelector(".add-row");
    if (addRow) {
      addRow.replaceChildren();
      for (const kind of ["image", "note", "audio"]) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = `chip add add-${kind}`;
        add.innerHTML = `<ha-icon icon="mdi:plus"></ha-icon><span></span>`;
        add.querySelector("span").textContent = t(kind === "note" ? "editor_add_note" : kind === "audio" ? "editor_add_audio" : "editor_add_page");
        add.disabled = full;
        add.addEventListener("click", () => this._addPage(kind));
        addRow.append(add);
      }
    }
    const maxNote = this._root.querySelector(".max-note");
    if (maxNote) maxNote.textContent = full ? t("editor_max_slides") : "";
    const importInput = this._root.querySelector(".import-folder");
    if (importInput) {
      importInput.placeholder = t("editor_import");
      importInput.title = t("editor_import_help");
      if (!importInput.value && !importInput.dataset.touched) {
        importInput.value = this._config?.upload_folder ?? DEFAULTS.upload_folder;
        importInput.addEventListener("input", () => importInput.dataset.touched = "1", { once: true });
      }
    }
    setText(".import span", t("editor_import_button"));
    const importButton = this._root.querySelector(".import");
    if (importButton) importButton.disabled = full || this._importing;
    setText(".preview-label", t("editor_preview"));
    setText(".preview-help", t("editor_preview_help"));
    setText(".play span", t("editor_play"));
    this._updatePreviewCard();
    const currentKind = this._kindOf(this._page());
    const currentPage = this._page();
    const showPicture = currentKind === "image" || hasPicture(currentPage);
    const showAudio = currentKind === "audio" || hasAudio(currentPage);
    this._root.querySelector(".picture")?.classList.toggle("hidden", !showPicture);
    this._renderMarkers(showPicture);
    this._renderAudioEditor(showAudio);
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
    const page = this._page();
    const kind = this._kindOf(page);
    if (multiple) {
      schema.push({ name: "page_title", selector: { text: {} } });
    }
    if (kind === "audio" || hasAudio(page)) {
      schema.push(
        { name: "audio", selector: { text: {} } },
        {
          name: "audio_entity",
          selector: { entity: { filter: [{ domain: "input_text" }, { domain: "text" }] } }
        }
      );
    }
    if (kind === "image" || hasPicture(page)) {
      schema.push(
        { name: "image", selector: { text: {} } },
        {
          name: "image_entity",
          selector: {
            entity: {
              filter: [{ domain: "image" }, { domain: "camera" }, { domain: "person" }, { domain: "input_text" }, { domain: "text" }]
            }
          }
        }
      );
    }
    if (kind === "audio" && !hasNote(page)) {
      return schema;
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
      },
      {
        name: "note_extras",
        type: "grid",
        flatten: true,
        schema: [
          { name: "expires", selector: { datetime: {} } },
          {
            name: "color",
            selector: {
              select: {
                mode: "dropdown",
                custom_value: true,
                options: [
                  { value: "", label: t("color_none") },
                  ...Object.keys(NOTE_COLOR_PRESETS).map((name) => ({ value: name, label: t(`color_${name}`) }))
                ]
              }
            }
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
              { name: "show_navigation", selector: { boolean: {} } },
              { name: "ken_burns", selector: { boolean: {} } }
            ]
          },
          {
            name: "appearance_notes",
            type: "grid",
            flatten: true,
            schema: [
              { name: "note_style", selector: { select: { mode: "dropdown", options: options(NOTE_STYLES, "note_style") } } },
              { name: "expired_slides", selector: { select: { mode: "dropdown", options: options(EXPIRED_MODES, "expired") } } }
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
          { name: "upload_folder", selector: { text: {} } },
          {
            name: "upload_max_size",
            selector: { number: { min: 0, max: 8e3, step: 10, mode: "box", unit_of_measurement: "px" } }
          },
          { name: "upload_crop", selector: { boolean: {} } }
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
          {
            name: "behaviour_checklist",
            type: "grid",
            flatten: true,
            schema: [
              { name: "checklist", selector: { boolean: {} } },
              { name: "checklist_writeback", selector: { boolean: {} } },
              { name: "show_camera", selector: { boolean: {} } },
              { name: "show_record", selector: { boolean: {} } }
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
      note_attribute: page.note_attribute ?? "",
      expires: page.expires ?? "",
      color: page.color ?? "",
      audio: typeof page.audio === "object" && page.audio !== null ? page.audio.media_content_id : page.audio ?? "",
      audio_entity: page.audio_entity ?? ""
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
      if (!PAGE_KEYS.includes(target) || target === "kind" || target === "markers") continue;
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
      const config = this._config ?? {};
      const image = await uploadPicture(hass, file, {
        target: config.upload_target === "media" ? "media" : "image",
        folder: config.upload_folder ?? DEFAULTS.upload_folder,
        maxSize: config.upload_max_size ?? DEFAULTS.upload_max_size,
        cropAspect: config.upload_crop ? parseAspectRatio(config.aspect_ratio ?? DEFAULTS.aspect_ratio) ?? void 0 : void 0
      });
      this._emit(this._withPage(this._pageIndex, { ...this._page(), image, image_entity: void 0 }));
      this._setStatus(t("editor_upload_done"), false);
    } catch (err) {
      const code = err instanceof UploadError ? err.code : "network";
      const message = code === "too_large" ? t("editor_upload_too_large") : code === "forbidden" ? t("editor_upload_forbidden") : err instanceof Error ? err.message : String(err);
      this._setStatus(`${t("editor_upload_failed")}: ${message}`, true);
    } finally {
      this._uploading = false;
      if (this._uploadButton) this._uploadButton.disabled = false;
    }
  }
  // ---------------------------------------------------------------- markers
  _markers() {
    const list = this._page().markers;
    return Array.isArray(list) ? list.map((m) => ({ ...m })) : [];
  }
  _setMarkers(markers) {
    const page = { ...this._page() };
    if (markers.length) {
      page.markers = markers;
    } else {
      delete page.markers;
    }
    this._emit(this._withPage(this._pageIndex, page));
  }
  _onCanvasClick(ev) {
    const canvas = ev.currentTarget;
    const target = ev.target;
    if (target.closest(".pin")) return;
    const img = this._canvasImg;
    if (!img || !img.getAttribute("src")) return;
    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.round(Math.min(100, Math.max(0, (ev.clientX - rect.left) / rect.width * 100)) * 10) / 10;
    const y = Math.round(Math.min(100, Math.max(0, (ev.clientY - rect.top) / rect.height * 100)) * 10) / 10;
    const markers = this._markers();
    if (this._selectedMarker >= 0 && this._selectedMarker < markers.length) {
      markers[this._selectedMarker] = { ...markers[this._selectedMarker], x, y };
    } else {
      if (markers.length >= MAX_MARKERS) return;
      markers.push({ x, y });
      this._selectedMarker = markers.length - 1;
    }
    void canvas;
    this._setMarkers(markers);
  }
  _renderMarkers(show) {
    const section = this._root.querySelector(".markers-editor");
    const pins = this._root.querySelector(".marker-canvas .pins");
    const list = this._root.querySelector(".marker-list");
    if (!section || !pins || !list) return;
    const t = (key) => translate(this._lang, key);
    const page = this._page();
    const hasPicture2 = Boolean(page.image) || Boolean(page.image_entity);
    section.classList.toggle("hidden", !show || !hasPicture2);
    if (!show || !hasPicture2) return;
    const label = section.querySelector(".markers-label");
    const help = section.querySelector(".markers-help");
    if (label) label.textContent = t("editor_markers");
    if (help) help.textContent = t("editor_markers_help");
    const markers = this._markers();
    if (this._selectedMarker >= markers.length) this._selectedMarker = -1;
    pins.replaceChildren();
    list.replaceChildren();
    markers.forEach((marker, index) => {
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = `pin${index === this._selectedMarker ? " selected" : ""}`;
      pin.style.left = `${marker.x}%`;
      pin.style.top = `${marker.y}%`;
      pin.textContent = String(index + 1);
      pin.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._selectedMarker = this._selectedMarker === index ? -1 : index;
        this._renderMarkers(true);
      });
      pins.append(pin);
      const row = document.createElement("div");
      row.className = `marker-row${index === this._selectedMarker ? " selected" : ""}`;
      const number = document.createElement("button");
      number.type = "button";
      number.className = "marker-number";
      number.textContent = String(index + 1);
      number.addEventListener("click", () => {
        this._selectedMarker = this._selectedMarker === index ? -1 : index;
        this._renderMarkers(true);
      });
      const field = (key, placeholder) => {
        const input = document.createElement("input");
        input.type = "text";
        input.className = `marker-${key}`;
        input.placeholder = placeholder;
        input.value = marker[key] ?? "";
        input.addEventListener("change", () => {
          const next = this._markers();
          const value = input.value.trim();
          if (value) next[index] = { ...next[index], [key]: value };
          else delete next[index][key];
          this._setMarkers(next);
        });
        return input;
      };
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.title = t("editor_marker_remove");
      remove.innerHTML = `<ha-icon icon="mdi:close"></ha-icon>`;
      remove.addEventListener("click", () => {
        const next = this._markers();
        next.splice(index, 1);
        this._selectedMarker = -1;
        this._setMarkers(next);
      });
      row.append(
        number,
        field("label", t("editor_marker_label")),
        field("icon", t("editor_marker_icon")),
        field("entity", t("editor_marker_entity")),
        remove
      );
      list.append(row);
    });
    if (!markers.length) {
      const empty = document.createElement("div");
      empty.className = "marker-empty";
      empty.textContent = t("editor_marker_none");
      list.append(empty);
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
    if (!img || !preview || !this._config) return;
    const page = this._page();
    const token = ++this._previewToken;
    const apply = (src) => {
      if (token !== this._previewToken) return;
      if (src) {
        img.src = src;
        preview.classList.add("has-image");
        if (this._canvasImg) this._canvasImg.src = src;
      } else {
        img.removeAttribute("src");
        preview.classList.remove("has-image");
        this._canvasImg?.removeAttribute("src");
      }
      this._clearButton?.classList.toggle("hidden", !src && !page.image_entity);
    };
    let image = page.image;
    if (page.image_entity && this._hass) {
      const entity = this._hass.states[page.image_entity];
      const domain = page.image_entity.split(".")[0];
      if (domain === "input_text" || domain === "text") {
        image = entity && entity.state !== "unknown" ? entity.state : "";
      } else {
        const picture = entity?.attributes.entity_picture;
        apply(typeof picture === "string" ? picture : "");
        return;
      }
    }
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
