import { DEFAULTS, DIRECTIONS, IMAGE_FITS, LAYOUTS, SIDES, TRANSITIONS } from "./const";
import type { ActionConfig, ImageNoteCardConfig, MediaValue, NormalizedConfig, NormalizedPage, PageConfig } from "./types";

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

export function validateConfig(config: unknown): asserts config is ImageNoteCardConfig {
  if (!config || typeof config !== "object") {
    throw new Error("ImageNote: configuration must be an object");
  }
  const c = config as Record<string, unknown>;
  if (c.transition !== undefined && !TRANSITIONS.includes(c.transition as never)) {
    throw new Error(`ImageNote: unknown transition "${String(c.transition)}" (use ${TRANSITIONS.join(", ")})`);
  }
  if (c.direction !== undefined && !DIRECTIONS.includes(c.direction as never)) {
    throw new Error(`ImageNote: unknown direction "${String(c.direction)}" (use ${DIRECTIONS.join(", ")})`);
  }
  if (c.default_side !== undefined && !SIDES.includes(c.default_side as never)) {
    throw new Error(`ImageNote: unknown default_side "${String(c.default_side)}" (use ${SIDES.join(", ")})`);
  }
  validatePage(c, "");
  if (c.images !== undefined) {
    if (!Array.isArray(c.images)) {
      throw new Error("ImageNote: images must be a list");
    }
    c.images.forEach((entry, index) => {
      if (typeof entry === "string") return;
      if (!entry || typeof entry !== "object") {
        throw new Error(`ImageNote: images[${index}] must be a URL or an object`);
      }
      validatePage(entry as Record<string, unknown>, `images[${index}].`);
    });
  }
}

function validatePage(c: Record<string, unknown>, prefix: string): void {
  if (c.note_entity !== undefined && c.note_entity !== "" && typeof c.note_entity !== "string") {
    throw new Error(`ImageNote: ${prefix}note_entity must be an entity id`);
  }
  if (c.image_entity !== undefined && c.image_entity !== "" && typeof c.image_entity !== "string") {
    throw new Error(`ImageNote: ${prefix}image_entity must be an entity id`);
  }
  if (
    c.image !== undefined &&
    c.image !== null &&
    typeof c.image !== "string" &&
    !(typeof c.image === "object" && typeof (c.image as { media_content_id?: unknown }).media_content_id === "string")
  ) {
    throw new Error(`ImageNote: ${prefix}image must be a URL, a media-source id or a media object`);
  }
}

function normalizePage(page: PageConfig): NormalizedPage {
  return {
    title: str(page.title).trim(),
    image: page.image === null || page.image === "" ? undefined : (page.image as string | MediaValue | undefined),
    image_entity: str(page.image_entity).trim(),
    note: str(page.note),
    note_entity: str(page.note_entity).trim(),
    note_attribute: str(page.note_attribute).trim(),
  };
}

/** The pages of a card: `images` when given, otherwise the top-level picture fields as one page. */
export function configPages(config: ImageNoteCardConfig): PageConfig[] {
  if (Array.isArray(config.images) && config.images.length > 0) {
    return config.images.map((entry) => (typeof entry === "string" ? { image: entry } : entry));
  }
  return [
    {
      image: config.image,
      image_entity: config.image_entity,
      note: config.note,
      note_entity: config.note_entity,
      note_attribute: config.note_attribute,
    },
  ];
}

export function normalizeConfig(config: ImageNoteCardConfig): NormalizedConfig {
  return {
    type: config.type,
    title: str(config.title).trim(),
    pages: configPages(config).map(normalizePage),
    layout: pick(config.layout, LAYOUTS, DEFAULTS.layout),
    columns: Math.round(num(config.columns, DEFAULTS.columns, 0, 8)),
    image_fit: pick(config.image_fit, IMAGE_FITS, DEFAULTS.image_fit),
    aspect_ratio: str(config.aspect_ratio, DEFAULTS.aspect_ratio).trim() || DEFAULTS.aspect_ratio,
    transition: pick(config.transition, TRANSITIONS, DEFAULTS.transition),
    direction: pick(config.direction, DIRECTIONS, DEFAULTS.direction),
    default_side: pick(config.default_side, SIDES, DEFAULTS.default_side),
    duration: num(config.duration, DEFAULTS.duration, 0, 10000),
    auto_flip: num(config.auto_flip, DEFAULTS.auto_flip, 0, 86400),
    auto_advance: num(config.auto_advance, DEFAULTS.auto_advance, 0, 86400),
    hover_flip: bool(config.hover_flip, DEFAULTS.hover_flip),
    show_hint: bool(config.show_hint, DEFAULTS.show_hint),
    show_title: bool(config.show_title, DEFAULTS.show_title),
    show_updated: bool(config.show_updated, DEFAULTS.show_updated),
    show_navigation: bool(config.show_navigation, DEFAULTS.show_navigation),
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
