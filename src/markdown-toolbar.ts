export type Format = "bold" | "italic" | "heading" | "list" | "checklist" | "link";

const BUTTONS: Array<{ format: Format; icon: string; label: string }> = [
  { format: "bold", icon: "mdi:format-bold", label: "fmtBold" },
  { format: "italic", icon: "mdi:format-italic", label: "fmtItalic" },
  { format: "heading", icon: "mdi:format-header-2", label: "fmtHeading" },
  { format: "list", icon: "mdi:format-list-bulleted", label: "fmtList" },
  { format: "checklist", icon: "mdi:format-list-checks", label: "fmtChecklist" },
  { format: "link", icon: "mdi:link-variant", label: "fmtLink" },
];

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string, placeholder: string): void {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end) || placeholder;
  const replacement = `${before}${selected}${after}`;
  textarea.setRangeText(replacement, start, end, "end");
  if (!value.slice(start, end)) {
    textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length);
  }
}

function prefixLines(textarea: HTMLTextAreaElement, prefix: string): void {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex < 0 ? value.length : lineEndIndex;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const allPrefixed = lines.every((line) => line.startsWith(prefix));
  const updated = lines.map((line) => (allPrefixed ? line.slice(prefix.length) : `${prefix}${line}`)).join("\n");
  textarea.setRangeText(updated, lineStart, lineEnd, "select");
}

/** Applies a Markdown format to the selection the way a simple rich-text toolbar would. */
export function applyFormat(textarea: HTMLTextAreaElement, format: Format, placeholders: Record<string, string>): void {
  textarea.focus();
  switch (format) {
    case "bold":
      wrapSelection(textarea, "**", "**", placeholders.text ?? "text");
      break;
    case "italic":
      wrapSelection(textarea, "*", "*", placeholders.text ?? "text");
      break;
    case "heading":
      prefixLines(textarea, "## ");
      break;
    case "list":
      prefixLines(textarea, "- ");
      break;
    case "checklist":
      prefixLines(textarea, "- [ ] ");
      break;
    case "link":
      wrapSelection(textarea, "[", "](https://)", placeholders.link ?? "link text");
      break;
  }
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

/** A row of formatting buttons bound to a textarea. `t` translates the button labels. */
export function buildToolbar(
  textarea: HTMLTextAreaElement,
  t: (key: string) => string,
  extra: HTMLElement[] = [],
): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "md-toolbar";
  for (const button of BUTTONS) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "md-button";
    el.title = t(button.label);
    el.setAttribute("aria-label", t(button.label));
    el.innerHTML = `<ha-icon icon="${button.icon}"></ha-icon>`;
    el.addEventListener("mousedown", (ev) => ev.preventDefault());
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      applyFormat(textarea, button.format, { text: t("fmtPlaceholder"), link: t("fmtLinkPlaceholder") });
    });
    bar.append(el);
  }
  for (const el of extra) bar.append(el);
  return bar;
}
