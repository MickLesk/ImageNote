import { DEFAULTS, DIRECTIONS, IMAGE_FITS, SIDES, TRANSITIONS } from "./const";
import type { ImageNoteCardConfig, NormalizedConfig } from "./types";

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
  if (c.note_entity !== undefined && c.note_entity !== "" && typeof c.note_entity !== "string") {
    throw new Error("ImageNote: note_entity must be an entity id");
  }
  if (c.image_entity !== undefined && c.image_entity !== "" && typeof c.image_entity !== "string") {
    throw new Error("ImageNote: image_entity must be an entity id");
  }
  if (
    c.image !== undefined &&
    c.image !== null &&
    typeof c.image !== "string" &&
    !(typeof c.image === "object" && typeof (c.image as { media_content_id?: unknown }).media_content_id === "string")
  ) {
    throw new Error("ImageNote: image must be a URL, a media-source id or a media object");
  }
}

export function normalizeConfig(config: ImageNoteCardConfig): NormalizedConfig {
  return {
    type: config.type,
    title: str(config.title).trim(),
    image: config.image === null || config.image === "" ? undefined : config.image,
    image_entity: str(config.image_entity).trim(),
    image_fit: pick(config.image_fit, IMAGE_FITS, DEFAULTS.image_fit),
    aspect_ratio: str(config.aspect_ratio, DEFAULTS.aspect_ratio).trim() || DEFAULTS.aspect_ratio,
    note: str(config.note),
    note_entity: str(config.note_entity).trim(),
    note_attribute: str(config.note_attribute).trim(),
    transition: pick(config.transition, TRANSITIONS, DEFAULTS.transition),
    direction: pick(config.direction, DIRECTIONS, DEFAULTS.direction),
    default_side: pick(config.default_side, SIDES, DEFAULTS.default_side),
    duration: num(config.duration, DEFAULTS.duration, 0, 10000),
    auto_flip: num(config.auto_flip, DEFAULTS.auto_flip, 0, 86400),
    hover_flip: bool(config.hover_flip, DEFAULTS.hover_flip),
    show_hint: bool(config.show_hint, DEFAULTS.show_hint),
    show_title: bool(config.show_title, DEFAULTS.show_title),
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
