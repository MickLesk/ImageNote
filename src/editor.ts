import { ASPECT_RATIOS, DEFAULTS, DIRECTIONS, IMAGE_FITS, MEDIA_SOURCE_PREFIX, MEDIA_EXPIRES_SECONDS, SIDES, TRANSITIONS, VERSION } from "./const";
import { resolveLanguage, translate } from "./i18n";
import { EDITOR_STYLES } from "./styles";
import type { HomeAssistant, ImageNoteCardConfig, ResolvedMedia } from "./types";

type FormSchema = Record<string, unknown> & { name: string };

interface HaFormElement extends HTMLElement {
  hass?: HomeAssistant;
  data?: Record<string, unknown>;
  schema?: FormSchema[];
  computeLabel?: (schema: FormSchema) => string;
  computeHelper?: (schema: FormSchema) => string;
}

const PICTURE_TEMPLATE = `
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

const PICTURE_STYLES = `
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

export class ImageNoteCardEditor extends HTMLElement {
  private readonly _root: ShadowRoot;
  private _config?: ImageNoteCardConfig;
  private _hass?: HomeAssistant;
  private _lang = "en";
  private _form?: HaFormElement;
  private _built = false;
  private _previewImg?: HTMLImageElement;
  private _preview?: HTMLElement;
  private _fileInput?: HTMLInputElement;
  private _status?: HTMLElement;
  private _clearButton?: HTMLButtonElement;
  private _uploadButton?: HTMLButtonElement;
  private _uploading = false;
  private _previewToken = 0;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
  }

  setConfig(config: ImageNoteCardConfig): void {
    this._config = { ...config };
    this._render();
  }

  set hass(hass: HomeAssistant) {
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

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  // ---------------------------------------------------------------- rendering

  private _build(): void {
    this._root.innerHTML = `<style>${EDITOR_STYLES}${PICTURE_STYLES}</style>${PICTURE_TEMPLATE}<ha-form></ha-form><div class="version">ImageNote ${VERSION}</div>`;
    this._form = this._root.querySelector<HaFormElement>("ha-form") ?? undefined;
    this._preview = this._root.querySelector<HTMLElement>(".preview") ?? undefined;
    this._previewImg = this._root.querySelector<HTMLImageElement>(".preview img") ?? undefined;
    this._fileInput = this._root.querySelector<HTMLInputElement>(".file") ?? undefined;
    this._status = this._root.querySelector<HTMLElement>(".status") ?? undefined;
    this._clearButton = this._root.querySelector<HTMLButtonElement>(".clear") ?? undefined;
    this._uploadButton = this._root.querySelector<HTMLButtonElement>(".upload") ?? undefined;

    this._form?.addEventListener("value-changed", this._onValueChanged as EventListener);
    this._uploadButton?.addEventListener("click", () => this._fileInput?.click());
    this._fileInput?.addEventListener("change", () => {
      const file = this._fileInput?.files?.[0];
      if (file) void this._upload(file);
      if (this._fileInput) this._fileInput.value = "";
    });
    this._clearButton?.addEventListener("click", () => {
      this._emit({ ...this._config, image: undefined, image_entity: undefined } as ImageNoteCardConfig);
    });
    this._previewImg?.addEventListener("error", () => {
      this._preview?.classList.remove("has-image");
    });
    this._built = true;
  }

  private _render(): void {
    if (!this._config) return;
    if (!this._built) this._build();
    const form = this._form;
    if (!form) return;
    const t = (key: string) => translate(this._lang, key);

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
    form.computeLabel = (schema) => t(`editor_${schema.name}`);
    form.computeHelper = (schema) => {
      const key = `editor_${schema.name}_help`;
      const text = t(key);
      return text === key ? "" : text;
    };
    this._updatePreview();
  }

  private _schema(): FormSchema[] {
    const t = (key: string) => translate(this._lang, key);
    const options = (values: readonly string[], prefix: string) =>
      values.map((value) => ({ value, label: t(`${prefix}_${value}`) }));
    return [
      { name: "title", selector: { text: {} } },
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
        expanded: Boolean(this._config?.note_entity),
        schema: [
          { name: "note_entity", selector: { entity: {} } },
          {
            name: "note_attribute",
            selector: { attribute: {} },
            context: { filter_entity: "note_entity" },
          },
        ],
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
              { name: "hover_flip", selector: { boolean: {} } },
            ],
          },
        ],
      },
    ];
  }

  private _formData(): Record<string, unknown> {
    const config = this._config ?? ({} as ImageNoteCardConfig);
    const image =
      typeof config.image === "object" && config.image !== null
        ? config.image.media_content_id
        : config.image ?? "";
    return {
      ...DEFAULTS,
      ...config,
      image,
    };
  }

  // ---------------------------------------------------------------- events

  private readonly _onValueChanged = (ev: CustomEvent<{ value: Record<string, unknown> }>): void => {
    ev.stopPropagation();
    if (!this._config) return;
    const value = ev.detail.value ?? {};
    const next: Record<string, unknown> = { ...this._config };
    for (const [key, raw] of Object.entries(value)) {
      if (key === "type") continue;
      const isDefault = key in DEFAULTS && raw === (DEFAULTS as Record<string, unknown>)[key];
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
    if (this._form) {
      this._form.data = this._formData();
    }
    this._updatePreview();
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
      this._setStatus(t("editor_upload_done"), false);
      this._emit({ ...this._config, image: url, image_entity: undefined } as ImageNoteCardConfig);
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
    const config = this._config;
    if (!img || !preview || !config) return;
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
      this._clearButton?.classList.toggle("hidden", !src && !config.image_entity);
    };

    if (config.image_entity && this._hass) {
      const entity = this._hass.states[config.image_entity];
      const picture = entity?.attributes.entity_picture;
      apply(typeof picture === "string" ? picture : "");
      return;
    }
    const image = config.image;
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
