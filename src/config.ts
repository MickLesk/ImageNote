import { DEFAULTS, DIRECTIONS, EXPIRED_MODES, IMAGE_FITS, LAYOUTS, MAX_SLIDES, NOTE_STYLES, SIDES, TRANSITIONS } from "./const";
import type {
  ActionConfig,
  PinboardCardConfig,
  Marker,
  MarkerConfig,
  MediaValue,
  NormalizedConfig,
  NormalizedPage,
  PageConfig,
  Slide,
  VisibilityCondition,
} from "./types";

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function str(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function num(value: unknown, fallback: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function action(value: unknown, fallback: ActionConfig): ActionConfig {
  if (typeof value === "string") return { action: value };
  if (value && typeof value === "object" && typeof (value as ActionConfig).action === "string") {
    return value as ActionConfig;
  }
  return fallback;
}

export function validateConfig(config: unknown): asserts config is PinboardCardConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Pinboard: configuration must be an object");
  }
  const c = config as Record<string, unknown>;
  if (c.transition !== undefined && !TRANSITIONS.includes(c.transition as never)) {
    throw new Error(`Pinboard: unknown transition "${String(c.transition)}" (use ${TRANSITIONS.join(", ")})`);
  }
  if (c.direction !== undefined && !DIRECTIONS.includes(c.direction as never)) {
    throw new Error(`Pinboard: unknown direction "${String(c.direction)}" (use ${DIRECTIONS.join(", ")})`);
  }
  if (c.default_side !== undefined && !SIDES.includes(c.default_side as never)) {
    throw new Error(`Pinboard: unknown default_side "${String(c.default_side)}" (use ${SIDES.join(", ")})`);
  }
  validatePage(c, "");
  for (const key of ["slides", "images"] as const) {
    const list = c[key];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      throw new Error(`Pinboard: ${key} must be a list`);
    }
    list.forEach((entry, index) => {
      if (typeof entry === "string") return;
      if (!entry || typeof entry !== "object") {
        throw new Error(`Pinboard: ${key}[${index}] must be a URL or an object`);
      }
      validatePage(entry as Record<string, unknown>, `${key}[${index}].`);
    });
  }
  const total = expandSlides(configPages(config as PinboardCardConfig).map(normalizePage)).length;
  if (total > MAX_SLIDES) {
    throw new Error(`Pinboard: at most ${MAX_SLIDES} slides per card (this card has ${total})`);
  }
}

function validatePage(c: Record<string, unknown>, prefix: string): void {
  if (c.note_entity !== undefined && c.note_entity !== "" && typeof c.note_entity !== "string") {
    throw new Error(`Pinboard: ${prefix}note_entity must be an entity id`);
  }
  if (c.image_entity !== undefined && c.image_entity !== "" && typeof c.image_entity !== "string") {
    throw new Error(`Pinboard: ${prefix}image_entity must be an entity id`);
  }
  for (const key of ["image", "audio"] as const) {
    const value = c[key];
    if (
      value !== undefined &&
      value !== null &&
      typeof value !== "string" &&
      !(typeof value === "object" && typeof (value as { media_content_id?: unknown }).media_content_id === "string")
    ) {
      throw new Error(`Pinboard: ${prefix}${key} must be a URL, a media-source id or a media object`);
    }
  }
}

function normalizeMarkers(markers: unknown): Marker[] {
  if (!Array.isArray(markers)) return [];
  const out: Marker[] = [];
  for (const raw of markers as MarkerConfig[]) {
    if (!raw || typeof raw !== "object") continue;
    const x = num(raw.x, Number.NaN, 0, 100);
    const y = num(raw.y, Number.NaN, 0, 100);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({
      x,
      y,
      label: str(raw.label).trim(),
      icon: str(raw.icon).trim(),
      entity: str(raw.entity).trim(),
    });
  }
  return out;
}

function normalizeVisibility(value: unknown): VisibilityCondition[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const out: VisibilityCondition[] = [];
  for (const raw of list as VisibilityCondition[]) {
    if (!raw || typeof raw !== "object" || typeof raw.entity !== "string" || !raw.entity.trim()) continue;
    const condition: VisibilityCondition = { entity: raw.entity.trim() };
    if (raw.state !== undefined) condition.state = Array.isArray(raw.state) ? raw.state.map(String) : String(raw.state);
    if (raw.state_not !== undefined) {
      condition.state_not = Array.isArray(raw.state_not) ? raw.state_not.map(String) : String(raw.state_not);
    }
    if (raw.attribute) condition.attribute = str(raw.attribute).trim();
    out.push(condition);
  }
  return out;
}

function optionalAction(value: unknown): ActionConfig | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return action(value, { action: "none" });
}

export function normalizePage(page: PageConfig): NormalizedPage {
  return {
    kind: page.kind === "note" || page.kind === "image" || page.kind === "audio" ? page.kind : undefined,
    title: str(page.title).trim(),
    image: page.image === null || page.image === "" ? undefined : (page.image as string | MediaValue | undefined),
    image_entity: str(page.image_entity).trim(),
    note: str(page.note),
    note_entity: str(page.note_entity).trim(),
    note_attribute: str(page.note_attribute).trim(),
    todo_entity: str(page.todo_entity).trim(),
    expires: str(page.expires).trim(),
    color: str(page.color).trim(),
    text_color: str(page.text_color).trim(),
    markers: normalizeMarkers(page.markers),
    audio: page.audio === null || page.audio === "" ? undefined : (page.audio as string | MediaValue | undefined),
    audio_entity: str(page.audio_entity).trim(),
    visible: normalizeVisibility(page.visible),
    tap_action: optionalAction(page.tap_action),
    hold_action: optionalAction(page.hold_action),
    double_tap_action: optionalAction(page.double_tap_action),
  };
}

/** True when every condition of the page holds for the given states. Pages without conditions are always visible. */
export function conditionsHold(
  conditions: VisibilityCondition[],
  states: Record<string, { state: string; attributes: Record<string, unknown> }> | undefined,
): boolean {
  if (!conditions.length) return true;
  if (!states) return true;
  return conditions.every((condition) => {
    const entity = states[condition.entity];
    if (!entity) return false;
    const raw = condition.attribute ? entity.attributes[condition.attribute] : entity.state;
    const value = raw === undefined || raw === null ? "" : String(raw);
    if (condition.state !== undefined) {
      const wanted = Array.isArray(condition.state) ? condition.state : [condition.state];
      return wanted.includes(value);
    }
    if (condition.state_not !== undefined) {
      const unwanted = Array.isArray(condition.state_not) ? condition.state_not : [condition.state_not];
      return !unwanted.includes(value);
    }
    return value !== "" && value !== "unavailable" && value !== "unknown";
  });
}

export function hasAudio(page: PageConfig | NormalizedPage): boolean {
  return Boolean(page.audio) || Boolean(page.audio_entity);
}

/** The config entries of a card: `slides` (or the older `images`) when given, otherwise the top-level fields as one entry. */
export function configPages(config: PinboardCardConfig): PageConfig[] {
  const list = Array.isArray(config.slides) && config.slides.length > 0 ? config.slides : config.images;
  if (Array.isArray(list) && list.length > 0) {
    return list.map((entry) => (typeof entry === "string" ? { image: entry } : entry));
  }
  return [
    {
      kind: config.kind,
      image: config.image,
      image_entity: config.image_entity,
      note: config.note,
      note_entity: config.note_entity,
      note_attribute: config.note_attribute,
      todo_entity: config.todo_entity,
      expires: config.expires,
      color: config.color,
      text_color: config.text_color,
      markers: config.markers,
      audio: config.audio,
      audio_entity: config.audio_entity,
      visible: config.visible,
    },
  ];
}

export function hasPicture(page: PageConfig | NormalizedPage): boolean {
  return Boolean(page.image) || Boolean(page.image_entity);
}

export function hasNote(page: PageConfig | NormalizedPage): boolean {
  return Boolean(page.note) || Boolean(page.note_entity) || Boolean(page.todo_entity);
}

/** An entry with a picture, a note and/or audio becomes one slide per part; an empty entry is an empty picture slide. */
export function expandSlides(entries: NormalizedPage[]): Slide[] {
  const slides: Slide[] = [];
  entries.forEach((entry, index) => {
    const picture = hasPicture(entry) || entry.kind === "image";
    const note = hasNote(entry) || entry.kind === "note";
    const audio = hasAudio(entry) || entry.kind === "audio";
    if (picture || (!note && !audio)) {
      slides.push({ ...entry, kind: "image", entry: index, note: "", note_entity: "", note_attribute: "", todo_entity: "", audio: undefined, audio_entity: "" });
    }
    if (note) {
      slides.push({ ...entry, kind: "note", entry: index, image: undefined, image_entity: "", audio: undefined, audio_entity: "" });
    }
    if (audio) {
      slides.push({ ...entry, kind: "audio", entry: index, image: undefined, image_entity: "", note: "", note_entity: "", note_attribute: "", todo_entity: "" });
    }
  });
  return slides;
}

export function normalizeConfig(config: PinboardCardConfig): NormalizedConfig {
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
    duration: num(config.duration, DEFAULTS.duration, 0, 10000),
    auto_flip: num(config.auto_flip, DEFAULTS.auto_flip, 0, 86400),
    // auto_advance is the older name; both advance to the next slide.
    auto_advance: num(config.auto_advance, DEFAULTS.auto_advance, 0, 86400),
    hover_flip: bool(config.hover_flip, DEFAULTS.hover_flip),
    swipe: bool(config.swipe, DEFAULTS.swipe),
    show_hint: bool(config.show_hint, DEFAULTS.show_hint),
    show_title: bool(config.show_title, DEFAULTS.show_title),
    show_updated: bool(config.show_updated, DEFAULTS.show_updated),
    show_navigation: bool(config.show_navigation, DEFAULTS.show_navigation),
    note_style: pick(config.note_style, NOTE_STYLES, DEFAULTS.note_style),
    expired_slides: pick(config.expired_slides, EXPIRED_MODES, DEFAULTS.expired_slides),
    checklist: bool(config.checklist, DEFAULTS.checklist),
    checklist_writeback: bool(config.checklist_writeback, DEFAULTS.checklist_writeback),
    todo_add: bool(config.todo_add, DEFAULTS.todo_add),
    todo_show_completed: bool(config.todo_show_completed, DEFAULTS.todo_show_completed),
    show_history: bool(config.show_history, DEFAULTS.show_history),
    upload_target: config.upload_target === "media" ? "media" : "image",
    upload_folder: str(config.upload_folder, DEFAULTS.upload_folder),
    upload_max_size: Math.round(num(config.upload_max_size, DEFAULTS.upload_max_size, 0, 8000)),
    upload_crop: bool(config.upload_crop, DEFAULTS.upload_crop),
    ken_burns: bool(config.ken_burns, DEFAULTS.ken_burns),
    show_camera: bool(config.show_camera, DEFAULTS.show_camera),
    show_record: bool(config.show_record, DEFAULTS.show_record),
    tap_action: action(config.tap_action, DEFAULTS.tap_action),
    hold_action: action(config.hold_action, DEFAULTS.hold_action),
    double_tap_action: action(config.double_tap_action, DEFAULTS.double_tap_action),
  };
}

/** Parses "16:9", "16/9", "1.5" or "auto". Returns null for auto / invalid input. */
export function parseAspectRatio(value: string): number | null {
  const text = value.trim().toLowerCase();
  if (!text || text === "auto") return null;
  const parts = text.split(/[:/x]/).map((p) => Number(p.trim()));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    return parts[0] / parts[1];
  }
  const single = Number(text);
  return Number.isFinite(single) && single > 0 ? single : null;
}
