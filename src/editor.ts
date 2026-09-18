import {
  ASPECT_RATIOS,
  DEFAULTS,
  DIRECTIONS,
  IMAGE_FITS,
  MEDIA_EXPIRES_SECONDS,
  MEDIA_SOURCE_PREFIX,
  SIDES,
  TRANSITIONS,
  VERSION,
} from "./const";
import { configPages } from "./config";
import { resolveLanguage, translate } from "./i18n";
import { EDITOR_STYLES } from "./styles";
import type { HomeAssistant, ImageNoteCardConfig, PageConfig, ResolvedMedia } from "./types";

type FormSchema = Record<string, unknown> & { name: string };

interface HaFormElement extends HTMLElement {
  hass?: HomeAssistant;
  data?: Record<string, unknown>;
  schema?: FormSchema[];
  computeLabel?: (schema: FormSchema) => string;
  computeHelper?: (schema: FormSchema) => string;
}

const UI_ACTIONS = ["more-info", "toggle", "navigate", "url", "perform-action", "none"];
const PAGE_KEYS: Array<keyof PageConfig> = ["title", "image", "image_entity", "note", "note_entity", "note_attribute"];

const TEMPLATE = `
<div class="pages">
  <div class="pages-label"></div>
  <div class="pages-help"></div>
  <div class="chips"></div>
</div>
<div class="picture">
  <div class="preview"><img alt="" draggable="false" /><ha-icon icon="mdi:image-outline"></ha-icon></div>
  <div class="picture-actions">
    <div class="picture-label"></div>
    <div class="picture-help"></div>
    <div class="buttons">
      <button class="btn primary upload" type="button"><ha-icon icon="mdi:upload"></ha-icon><span></span></button>
      <button class="btn clear" type="button"><ha-icon icon="mdi:close"></ha-icon><span></span></button>
      <button class="btn remove-page" type="button"><ha-icon icon="mdi:delete-outline"></ha-icon><span></span></button>
    </div>
    <div class="status"></div>
    <input class="file" type="file" accept="image/*" hidden />
  </div>
</div>
<ha-form class="page-form"></ha-form>
<div class="divider"></div>
<ha-form class="card-form"></ha-form>
<div class="version">ImageNote ${VERSION}</div>`;

const STYLES = `
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
.chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-primary-color, #fff);
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

export class ImageNoteCardEditor extends HTMLElement {
  private readonly _root: ShadowRoot;
  private _config?: ImageNoteCardConfig;
  private _hass?: HomeAssistant;
  private _lang = "en";
  private _built = false;
  private _pageIndex = 0;
  private _pageForm?: HaFormElement;
  private _cardForm?: HaFormElement;
  private _chips?: HTMLElement;
  private _previewImg?: HTMLImageElement;
  private _preview?: HTMLElement;
  private _fileInput?: HTMLInputElement;
  private _status?: HTMLElement;
  private _clearButton?: HTMLButtonElement;
  private _uploadButton?: HTMLButtonElement;
  private _removePageButton?: HTMLButtonElement;
  private _uploading = false;
  private _previewToken = 0;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
  }

  setConfig(config: ImageNoteCardConfig): void {
    this._config = { ...config };
    const total = configPages(this._config).length;
    if (this._pageIndex >= total) this._pageIndex = total - 1;
    this._render();
  }

  set hass(hass: HomeAssistant) {
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

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  // ---------------------------------------------------------------- pages

  private _pages(): PageConfig[] {
    return this._config ? configPages(this._config) : [{}];
  }

  private _page(): PageConfig {
    return this._pages()[this._pageIndex] ?? {};
  }

  /** Writes a page back into the config: into `images` when there are several, flat otherwise. */
  private _withPage(index: number, page: PageConfig): ImageNoteCardConfig {
    const config = { ...(this._config ?? { type: "" }) } as ImageNoteCardConfig;
    const pages = this._pages().map((p) => ({ ...p }));
    pages[index] = cleanPage(page);
    return this._withPages(config, pages);
  }

  private _withPages(config: ImageNoteCardConfig, pages: PageConfig[]): ImageNoteCardConfig {
    const next: Record<string, unknown> = { ...config };
    for (const key of PAGE_KEYS) {
      if (key !== "title") delete next[key];
    }
    if (pages.length <= 1) {
      delete next.images;
      const only = cleanPage(pages[0] ?? {});
      for (const key of PAGE_KEYS) {
        if (key === "title") {
          // A single page keeps the card title; a page title would be redundant.
          if (only.title && !next.title) next.title = only.title;
          continue;
        }
        if (only[key] !== undefined) next[key] = only[key];
      }
    } else {
      next.images = pages.map(cleanPage);
    }
    return next as unknown as ImageNoteCardConfig;
  }

  private _addPage(): void {
    const pages = this._pages().map((p) => ({ ...p }));
    pages.push({});
    this._pageIndex = pages.length - 1;
    this._emit(this._withPages(this._config ?? { type: "" }, pages));
  }

  private _removePage(): void {
    const pages = this._pages().map((p) => ({ ...p }));
    if (pages.length <= 1) return;
    pages.splice(this._pageIndex, 1);
    this._pageIndex = Math.min(this._pageIndex, pages.length - 1);
    this._emit(this._withPages(this._config ?? { type: "" }, pages));
  }

  private _selectPage(index: number): void {
    this._pageIndex = index;
    this._render();
  }

  // ---------------------------------------------------------------- rendering

  private _ensureForm(): void {
    if (customElements.get("ha-form")) return;
    // ha-form and the selectors are lazy; the entities card editor pulls them all in.
    window
      .loadCardHelpers?.()
      .then((helpers) => {
        const card = helpers.createCardElement({ type: "entities", entities: [] });
        const ctor = card.constructor as { getConfigElement?: () => unknown };
        ctor.getConfigElement?.();
      })
      .catch(() => undefined);
  }

  private _build(): void {
    this._ensureForm();
    this._root.innerHTML = `<style>${EDITOR_STYLES}${STYLES}</style>${TEMPLATE}`;
    const q = <T extends Element>(selector: string) => this._root.querySelector<T>(selector) ?? undefined;
    this._pageForm = q<HaFormElement>(".page-form");
    this._cardForm = q<HaFormElement>(".card-form");
    this._chips = q<HTMLElement>(".chips");
    this._preview = q<HTMLElement>(".preview");
    this._previewImg = q<HTMLImageElement>(".preview img");
    this._fileInput = q<HTMLInputElement>(".file");
    this._status = q<HTMLElement>(".status");
    this._clearButton = q<HTMLButtonElement>(".clear");
    this._uploadButton = q<HTMLButtonElement>(".upload");
    this._removePageButton = q<HTMLButtonElement>(".remove-page");

    this._pageForm?.addEventListener("value-changed", this._onPageValueChanged as EventListener);
    this._cardForm?.addEventListener("value-changed", this._onCardValueChanged as EventListener);
    this._uploadButton?.addEventListener("click", () => this._fileInput?.click());
    this._fileInput?.addEventListener("change", () => {
      const file = this._fileInput?.files?.[0];
      if (file) void this._upload(file);
      if (this._fileInput) this._fileInput.value = "";
    });
    this._clearButton?.addEventListener("click", () => {
      this._emit(this._withPage(this._pageIndex, { ...this._page(), image: undefined, image_entity: undefined }));
    });
    this._removePageButton?.addEventListener("click", () => this._removePage());
    this._previewImg?.addEventListener("error", () => {
      this._preview?.classList.remove("has-image");
    });
    this._built = true;
  }

  private _render(): void {
    if (!this._config) return;
    if (!this._built) this._build();
    const t = (key: string, vars?: Record<string, string | number>) => translate(this._lang, key, vars);
    const setText = (selector: string, text: string) => {
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

    const pages = this._pages();
    if (this._chips) {
      this._chips.replaceChildren();
      pages.forEach((_, index) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `chip${index === this._pageIndex ? " active" : ""}`;
        chip.textContent = t("editor_page_label", { index: index + 1 });
        chip.addEventListener("click", () => this._selectPage(index));
        this._chips?.append(chip);
      });
      const add = document.createElement("button");
      add.type = "button";
      add.className = "chip add";
      add.innerHTML = `<ha-icon icon="mdi:plus"></ha-icon><span></span>`;
      add.querySelector("span")!.textContent = t("editor_add_page");
      add.addEventListener("click", () => this._addPage());
      this._chips.append(add);
    }
    this._removePageButton?.classList.toggle("hidden", pages.length <= 1);

    const computeHelper = (schema: FormSchema) => {
      const key = `editor_${schema.name}_help`;
      const text = t(key);
      return text === key ? "" : text;
    };
    const computeLabel = (schema: FormSchema) =>
      schema.name === "actions_help" ? t("editor_actions_help") : t(`editor_${schema.name}`);

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

  private _pageSchema(multiple: boolean): FormSchema[] {
    const t = (key: string) => translate(this._lang, key);
    const schema: FormSchema[] = [];
    if (multiple) {
      schema.push({ name: "page_title", selector: { text: {} } });
    }
    schema.push(
      { name: "image", selector: { text: {} } },
      {
        name: "image_entity",
        selector: {
          entity: { filter: [{ domain: "image" }, { domain: "camera" }, { domain: "person" }] },
        },
      },
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
            context: { filter_entity: "note_entity" },
          },
        ],
      },
    );
    return schema;
  }

  private _cardSchema(): FormSchema[] {
    const t = (key: string) => translate(this._lang, key);
    const options = (values: readonly string[], prefix: string) =>
      values.map((value) => ({ value, label: t(`${prefix}_${value}`) }));
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
                      label: value === "auto" ? t("ratio_auto") : value,
                    })),
                  },
                },
              },
              { name: "image_fit", selector: { select: { mode: "dropdown", options: options(IMAGE_FITS, "fit") } } },
              {
                name: "duration",
                selector: { number: { min: 0, max: 5000, step: 50, mode: "box", unit_of_measurement: "ms" } },
              },
            ],
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
            ],
          },
        ],
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
                selector: { number: { min: 0, max: 3600, step: 1, mode: "box", unit_of_measurement: "s" } },
              },
              {
                name: "auto_advance",
                selector: { number: { min: 0, max: 3600, step: 1, mode: "box", unit_of_measurement: "s" } },
              },
              { name: "hover_flip", selector: { boolean: {} } },
            ],
          },
          { name: "actions_help", type: "constant", value: "" },
          { name: "hold_action", selector: { ui_action: { actions: UI_ACTIONS, default_action: "none" } } },
          { name: "double_tap_action", selector: { ui_action: { actions: UI_ACTIONS, default_action: "none" } } },
        ],
      },
    ];
  }

  private _pageData(): Record<string, unknown> {
    const page = this._page();
    const image =
      typeof page.image === "object" && page.image !== null ? page.image.media_content_id : page.image ?? "";
    return {
      page_title: page.title ?? "",
      image,
      image_entity: page.image_entity ?? "",
      note: page.note ?? "",
      note_entity: page.note_entity ?? "",
      note_attribute: page.note_attribute ?? "",
    };
  }

  private _cardData(): Record<string, unknown> {
    const config = this._config ?? ({ type: "" } as ImageNoteCardConfig);
    const data: Record<string, unknown> = { ...DEFAULTS };
    for (const [key, value] of Object.entries(config)) {
      if (key === "images" || (PAGE_KEYS as string[]).includes(key) && key !== "title") continue;
      data[key] = value;
    }
    return data;
  }

  // ---------------------------------------------------------------- events

  private readonly _onPageValueChanged = (ev: CustomEvent<{ value: Record<string, unknown> }>): void => {
    ev.stopPropagation();
    if (!this._config) return;
    const value = ev.detail.value ?? {};
    const page: PageConfig = { ...this._page() };
    for (const [key, raw] of Object.entries(value)) {
      const target = key === "page_title" ? "title" : key;
      if (!(PAGE_KEYS as string[]).includes(target)) continue;
      if (raw === undefined || raw === null || raw === "") {
        delete page[target as keyof PageConfig];
      } else {
        (page as Record<string, unknown>)[target] = raw;
      }
    }
    this._emit(this._withPage(this._pageIndex, page));
  };

  private readonly _onCardValueChanged = (ev: CustomEvent<{ value: Record<string, unknown> }>): void => {
    ev.stopPropagation();
    if (!this._config) return;
    const value = ev.detail.value ?? {};
    const next: Record<string, unknown> = { ...this._config };
    for (const [key, raw] of Object.entries(value)) {
      if (key === "type" || key === "images" || ((PAGE_KEYS as string[]).includes(key) && key !== "title")) continue;
      const fallback = (DEFAULTS as Record<string, unknown>)[key];
      const isDefault =
        key in DEFAULTS &&
        (raw === fallback ||
          (typeof raw === "object" && raw !== null && JSON.stringify(raw) === JSON.stringify(fallback)));
      if (raw === undefined || raw === null || raw === "" || isDefault) {
        delete next[key];
      } else {
        next[key] = raw;
      }
    }
    this._emit(next as unknown as ImageNoteCardConfig);
  };

  private _emit(config: ImageNoteCardConfig): void {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined && value !== null && value !== "") cleaned[key] = value;
    }
    this._config = cleaned as unknown as ImageNoteCardConfig;
    this._render();
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ---------------------------------------------------------------- picture upload

  private async _upload(file: File): Promise<void> {
    const hass = this._hass;
    if (!hass || this._uploading) return;
    const t = (key: string) => translate(this._lang, key);
    this._uploading = true;
    this._setStatus(t("editor_uploading"), false);
    if (this._uploadButton) this._uploadButton.disabled = true;
    try {
      const body = new FormData();
      body.append("file", file);
      const init: RequestInit = { method: "POST", body };
      let response: Response;
      if (hass.fetchWithAuth) {
        response = await hass.fetchWithAuth("/api/image/upload", init);
      } else {
        const token = hass.auth?.data?.access_token ?? "";
        response = await fetch("/api/image/upload", {
          ...init,
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (response.status === 413) {
        throw new Error(t("editor_upload_too_large"));
      }
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const media = (await response.json()) as { id: string };
      const url = `/api/image/serve/${media.id}/original`;
      this._emit(this._withPage(this._pageIndex, { ...this._page(), image: url, image_entity: undefined }));
      this._setStatus(t("editor_upload_done"), false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._setStatus(`${t("editor_upload_failed")}: ${message}`, true);
    } finally {
      this._uploading = false;
      if (this._uploadButton) this._uploadButton.disabled = false;
    }
  }

  private _setStatus(text: string, isError: boolean): void {
    if (!this._status) return;
    this._status.textContent = text;
    this._status.classList.toggle("error", isError);
  }

  private _updatePreview(): void {
    const img = this._previewImg;
    const preview = this._preview;
    if (!img || !preview || !this._config) return;
    const page = this._page();
    const token = ++this._previewToken;

    const apply = (src: string) => {
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
    const mediaId =
      typeof image === "object" && image !== null
        ? image.media_content_id
        : typeof image === "string" && image.startsWith(MEDIA_SOURCE_PREFIX)
          ? image
          : undefined;
    if (!mediaId) {
      apply(typeof image === "string" ? image : "");
      return;
    }
    if (!this._hass) {
      apply("");
      return;
    }
    void this._hass
      .callWS<ResolvedMedia>({
        type: "media_source/resolve_media",
        media_content_id: mediaId,
        expires: MEDIA_EXPIRES_SECONDS,
      })
      .then((result) => apply(result.url))
      .catch(() => apply(""));
  }
}

function cleanPage(page: PageConfig): PageConfig {
  const out: Record<string, unknown> = {};
  for (const key of PAGE_KEYS) {
    const value = page[key];
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out as PageConfig;
}
