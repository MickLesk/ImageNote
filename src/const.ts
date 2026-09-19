import type { ActionConfig, NormalizedConfig, Transition, Direction, Side, ImageFit, Layout, NoteStyle, ExpiredMode } from "./types";

export const CARD_TYPE = "pinboard-card";
export const EDITOR_TYPE = "pinboard-card-editor";
export const CARD_NAME = "Pinboard Card";
export const CARD_DESCRIPTION =
  "Pictures, notes, checklists and voice memos on one card. Tap to turn to the next page.";
export const DOCUMENTATION_URL = "https://github.com/MickLesk/pinboard-card";
export const VERSION = __VERSION__;

export const TRANSITIONS: Transition[] = ["flip", "fade", "slide", "cube", "none"];
export const DIRECTIONS: Direction[] = ["horizontal", "vertical"];
export const SIDES: Side[] = ["image", "note"];
export const IMAGE_FITS: ImageFit[] = ["cover", "contain"];
export const LAYOUTS: Layout[] = ["stack", "grid"];
export const TILE_MIN_WIDTH_PX = 150;
export const MAX_SLIDES = 10;
export const NOTE_STYLES: NoteStyle[] = ["plain", "sticky"];
export const EXPIRED_MODES: ExpiredMode[] = ["dim", "hide"];
export const ASPECT_RATIOS = ["16:9", "4:3", "3:2", "1:1", "3:4", "9:16", "auto"];

export const NOTE_ENTITY_DOMAINS = ["input_text", "text"];
/** Entities whose state is a picture URL or media id, so the card can write a new photo into them. */
export const IMAGE_URL_ENTITY_DOMAINS = ["input_text", "text"];
export const MAX_MARKERS = 20;
export const HISTORY_DAYS = 30;
export const HISTORY_ROWS = 15;
/** Recordings stop on their own after this many seconds. */
export const MAX_RECORDING_SECONDS = 180;

export const MEDIA_SOURCE_PREFIX = "media-source://";
/** How long a signed media-source URL is requested for, in seconds (24 h). */
export const MEDIA_EXPIRES_SECONDS = 24 * 60 * 60;
/** Re-resolve a signed URL a little before it expires. */
export const MEDIA_REFRESH_MS = (MEDIA_EXPIRES_SECONDS - 10 * 60) * 1000;

export const FLIP_ACTION: ActionConfig = { action: "flip" };
export const NONE_ACTION: ActionConfig = { action: "none" };
export const HOLD_DELAY_MS = 500;
export const DOUBLE_TAP_WINDOW_MS = 250;

export const SWIPE_THRESHOLD_PX = 40;

export const DEFAULTS: Omit<NormalizedConfig, "type" | "entries" | "slides"> = {
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
  swipe: true,
  show_hint: true,
  show_title: true,
  show_updated: true,
  show_navigation: true,
  note_style: "plain",
  expired_slides: "dim",
  checklist: true,
  checklist_writeback: true,
  todo_add: true,
  todo_show_completed: true,
  show_history: true,
  upload_target: "image",
  upload_folder: "pinboard",
  upload_max_size: 1920,
  upload_crop: false,
  ken_burns: false,
  show_camera: true,
  show_record: true,
  tap_action: FLIP_ACTION,
  hold_action: NONE_ACTION,
  double_tap_action: NONE_ACTION,
};

/** Inline SVG shown by the card picker preview so the stub config has a picture. */
export const SAMPLE_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#2c5364"/><stop offset=".5" stop-color="#203a43"/>` +
      `<stop offset="1" stop-color="#0f2027"/></linearGradient></defs>` +
      `<rect width="640" height="360" fill="url(#g)"/>` +
      `<circle cx="500" cy="90" r="46" fill="#ffd166" opacity=".9"/>` +
      `<path d="M0 300 L120 210 L210 270 L330 170 L430 250 L520 200 L640 280 L640 360 L0 360 Z" fill="#06d6a0" opacity=".75"/>` +
      `<path d="M0 330 L90 280 L180 320 L300 250 L420 310 L560 260 L640 320 L640 360 L0 360 Z" fill="#118ab2" opacity=".85"/>` +
      `</svg>`,
  );
