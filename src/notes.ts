export interface ChecklistItem {
  /** Line index in the original text, for writing the toggle back. */
  line: number;
  checked: boolean;
  text: string;
}

export type NoteBlock =
  | { type: "markdown"; text: string }
  | { type: "checklist"; items: ChecklistItem[] };

const TASK_LINE = /^(\s*)[-*+]\s+\[([ xX])\]\s?(.*)$/;

/** Splits a note into markdown blocks and checklist blocks (runs of "- [ ] …" lines). */
export function parseNoteBlocks(text: string): NoteBlock[] {
  const lines = text.split("\n");
  const blocks: NoteBlock[] = [];
  let markdown: string[] = [];
  let items: ChecklistItem[] = [];
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

export function hasChecklist(text: string): boolean {
  return text.split("\n").some((line) => TASK_LINE.test(line));
}

/** Returns the note with the checkbox on `line` set to `checked`. */
export function toggleChecklistLine(text: string, line: number, checked: boolean): string {
  const lines = text.split("\n");
  const match = TASK_LINE.exec(lines[line] ?? "");
  if (!match) return text;
  lines[line] = `${match[1]}- [${checked ? "x" : " "}] ${match[3]}`;
  return lines.join("\n");
}

export function hasTemplate(text: string): boolean {
  return /\{\{|\{%/.test(text);
}

/** Parses "2026-10-01", "2026-10-01 18:00" or a full ISO string. Returns null when unreadable. */
export function parseExpiry(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (dateOnly) {
    // A bare date expires at the end of that day, local time.
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 23, 59, 59, 999);
  }
  const date = new Date(text.includes("T") ? text : text.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isExpired(value: string, now = new Date()): boolean {
  const date = parseExpiry(value);
  return date !== null && date.getTime() < now.getTime();
}

/** Tints for note pages. Names map to gentle paper colours; any CSS colour works too. */
export const NOTE_COLOR_PRESETS: Record<string, string> = {
  yellow: "#fff3a8",
  green: "#d4f5cd",
  blue: "#d6ebff",
  pink: "#ffd9e6",
  orange: "#ffe0b8",
  purple: "#e6dcff",
  grey: "#e9e9ee",
};

export function resolveNoteColor(value: string): string | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  return NOTE_COLOR_PRESETS[text] ?? value.trim();
}

/** Resolves the text_color option: auto → contrast to the tint, light/dark → fixed, anything else → as given. */
export function resolveTextColor(value: string, background: string | null): string | null {
  const text = value.trim().toLowerCase();
  if (!text || text === "auto") return background ? contrastTextColor(background) : null;
  if (text === "light" || text === "white") return "#ffffff";
  if (text === "dark" || text === "black") return "#1f1f1f";
  return value.trim();
}

/** Dark text on light tints, light text on dark ones. Unknown formats fall back to dark text. */
export function contrastTextColor(color: string): string {
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

