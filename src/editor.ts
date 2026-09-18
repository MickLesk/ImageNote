import {
  ASPECT_RATIOS,
  DEFAULTS,
  DIRECTIONS,
  EXPIRED_MODES,
  IMAGE_FITS,
  LAYOUTS,
  NOTE_STYLES,
  MEDIA_EXPIRES_SECONDS,
  MEDIA_SOURCE_PREFIX,
  SIDES,
  TRANSITIONS,
  VERSION,
} from "./const";
import { CARD_TYPE, MAX_MARKERS, MAX_SLIDES, MEDIA_SOURCE_PREFIX as MEDIA_PREFIX } from "./const";
import { parseAspectRatio } from "./config";
import { UploadError, preferredAudioType, uploadAudio, uploadPicture } from "./upload";
import { configPages, expandSlides, hasAudio, hasNote, hasPicture, normalizePage } from "./config";
import { NOTE_COLOR_PRESETS } from "./notes";
import { resolveLanguage, translate } from "./i18n";
import { EDITOR_STYLES } from "./styles";
import type { HomeAssistant, PinboardCardConfig, MarkerConfig, PageConfig, ResolvedMedia } from "./types";

type FormSchema = Record<string, unknown> & { name: string };

interface HaFormElement extends HTMLElement {
  hass?: HomeAssistant;
  data?: Record<string, unknown>;
  schema?: FormSchema[];
  computeLabel?: (schema: FormSchema) => string;
  computeHelper?: (schema: FormSchema) => string;
}

const UI_ACTIONS = ["more-info", "toggle", "navigate", "url", "perform-action", "none"];
const UPLOAD_TARGETS = ["image", "media"];
const EDITOR_DEFAULTS: Record<string, unknown> = {};
const PAGE_KEYS: Array<keyof PageConfig> = ["kind", "title", "image", "image_entity", "note", "note_entity", "note_attribute", "expires", "color", "markers", "audio", "audio_entity"];
type EntryKind = "image" | "note" | "audio" | "both";
const LIST_KEYS = ["slides", "images"];

const TEMPLATE = `
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
<div class="version">Pinboard ${VERSION}</div>`;

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
.preview-card pinboard-card {
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

export class PinboardCardEditor extends HTMLElement {
  private readonly _root: ShadowRoot;
  private _config?: PinboardCardConfig;
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
  private _moveLeftButton?: HTMLButtonElement;
  private _moveRightButton?: HTMLButtonElement;
  private _uploading = false;
  private _previewToken = 0;
  private _selectedMarker = -1;
  private _canvasImg?: HTMLImageElement;
  private _previewCard?: HTMLElement & { setConfig(config: PinboardCardConfig): void; hass?: HomeAssistant; flip(): void };
  private _dragIndex = -1;
  private _importing = false;
  private _recorder?: MediaRecorder;
  private _recordTimer?: number;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
  }

  setConfig(config: PinboardCardConfig): void {
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
    if (this._previewCard) this._previewCard.hass = hass;
    if (langChanged) {
      this._render();
    } else {
      this._updatePreview();
    }
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  private _pages(): PageConfig[] {
    return this._config ? configPages(this._config) : [{}];
  }

  private _page(): PageConfig {
    return this._pages()[this._pageIndex] ?? {};
  }

  private _kindOf(page: PageConfig): EntryKind {
    const picture = hasPicture(page) || page.kind === "image";
    const note = hasNote(page) || page.kind === "note";
    const audio = hasAudio(page) || page.kind === "audio";
    const parts = [picture, note, audio].filter(Boolean).length;
    if (parts > 1) return "both";
    if (audio) return "audio";
    return note ? "note" : "image";
  }

  private _slideCount(pages: PageConfig[]): number {
    return expandSlides(pages.map(normalizePage)).length;
  }

  /** Writes an entry back into the config: into `slides` when there are several, flat otherwise. */
  private _withPage(index: number, page: PageConfig): PinboardCardConfig {
    const config = { ...(this._config ?? { type: "" }) } as PinboardCardConfig;
    const pages = this._pages().map((p) => ({ ...p }));
    pages[index] = cleanPage(page);
    return this._withPages(config, pages);
  }

  private _withPages(config: PinboardCardConfig, pages: PageConfig[]): PinboardCardConfig {
    const next: Record<string, unknown> = { ...config };
    for (const key of PAGE_KEYS) {
      if (key !== "title") delete next[key];
    }
    for (const key of LIST_KEYS) delete next[key];
    if (pages.length <= 1) {
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
      next.slides = pages.map(cleanPage);
    }
    return next as unknown as PinboardCardConfig;
  }

  private _addPage(kind: "image" | "note" | "audio"): void {
    const pages = this._pages().map((p) => ({ ...p }));
    if (this._slideCount(pages) >= MAX_SLIDES) return;
    pages.push(kind === "image" ? {} : { kind });
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

  private _movePage(delta: number): void {
    const pages = this._pages().map((p) => ({ ...p }));
    const from = this._pageIndex;
    const to = from + delta;
    if (to < 0 || to >= pages.length) return;
    [pages[from], pages[to]] = [pages[to], pages[from]];
    this._pageIndex = to;
    this._emit(this._withPages(this._config ?? { type: "" }, pages));
  }

  private _reorder(from: number, to: number): void {
    const pages = this._pages().map((p) => ({ ...p }));
    if (from < 0 || from >= pages.length || to < 0 || to >= pages.length) return;
    const [moved] = pages.splice(from, 1);
    pages.splice(to, 0, moved);
    this._pageIndex = to;
    this._emit(this._withPages(this._config ?? { type: "" }, pages));
  }

  /** Adds every picture of a folder below /media as an entry, up to the slide limit. */
  private async _importFolder(): Promise<void> {
    const hass = this._hass;
    const input = this._root.querySelector<HTMLInputElement>(".import-folder");
    const status = this._root.querySelector<HTMLElement>(".import-status");
    if (!hass || !input || this._importing) return;
    const t = (key: string, vars?: Record<string, string | number>) => translate(this._lang, key, vars);
    const folder = input.value.trim().replace(/^\/+|\/+$/g, "");
    const id = folder.startsWith(MEDIA_PREFIX) ? folder : `${MEDIA_PREFIX}media_source/local${folder ? `/${folder}` : ""}`;
    this._importing = true;
    if (status) {
      status.textContent = t("editor_uploading");
      status.classList.remove("error");
    }
    try {
      const result = await hass.callWS<{ children?: Array<{ media_content_id: string; media_class?: string; media_content_type?: string }> }>({
        type: "media_source/browse_media",
        media_content_id: id,
      });
      const pictures = (result.children ?? []).filter(
        (child) => child.media_class === "image" || (child.media_content_type ?? "").startsWith("image/"),
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
      const button = this._root.querySelector<HTMLButtonElement>(".import");
      if (button) button.disabled = false;
    }
  }

  private _renderAudioEditor(show: boolean): void {
    const section = this._root.querySelector<HTMLElement>(".audio-editor");
    if (!section) return;
    section.classList.toggle("hidden", !show);
    if (!show) return;
    const t = (key: string) => translate(this._lang, key);
    const setText = (selector: string, text: string) => {
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

  private _updateAudioPreview(): void {
    const audio = this._root.querySelector<HTMLAudioElement>(".audio-preview");
    if (!audio) return;
    const page = this._page();
    let source: string | undefined;
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
    if (!source.startsWith(MEDIA_PREFIX)) {
      if (audio.getAttribute("src") !== source) audio.src = source;
      return;
    }
    if (!this._hass) return;
    const wanted = source;
    void this._hass
      .callWS<ResolvedMedia>({ type: "media_source/resolve_media", media_content_id: wanted, expires: MEDIA_EXPIRES_SECONDS })
      .then((result) => {
        if (audio.dataset.mediaId !== wanted) {
          audio.dataset.mediaId = wanted;
          audio.src = result.url;
        }
      })
      .catch(() => audio.removeAttribute("src"));
  }

  private _setAudioStatus(text: string, isError = false): void {
    const status = this._root.querySelector<HTMLElement>(".audio-editor-status");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("error", isError);
  }

  private async _uploadAudioFile(file: File | Blob, name = "memo"): Promise<void> {
    const hass = this._hass;
    if (!hass) return;
    const t = (key: string) => translate(this._lang, key);
    this._setAudioStatus(t("editor_uploading"));
    try {
      const folder = this._config?.upload_folder ?? (DEFAULTS.upload_folder as string);
      const value = await uploadAudio(hass, file, folder, name);
      const page: PageConfig = { ...this._page(), audio: value };
      delete page.kind;
      this._emit(this._withPage(this._pageIndex, page));
      this._setAudioStatus(t("editor_upload_done"));
    } catch (err) {
      const code = err instanceof UploadError ? err.code : "network";
      const message =
        code === "too_large"
          ? t("editor_upload_too_large")
          : code === "forbidden"
            ? t("editor_upload_forbidden")
            : err instanceof Error
              ? err.message
              : String(err);
      this._setAudioStatus(`${t("editor_upload_failed")}: ${message}`, true);
    }
  }

  private async _toggleRecord(): Promise<void> {
    const t = (key: string, vars?: Record<string, string | number>) => translate(this._lang, key, vars);
    if (this._recorder) {
      if (this._recorder.state !== "inactive") this._recorder.stop();
      return;
    }
    const Recorder = (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
    if (!Recorder || !navigator.mediaDevices?.getUserMedia) {
      this._setAudioStatus(t("micUnsupported"), true);
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this._setAudioStatus(t("micDenied"), true);
      return;
    }
    const type = preferredAudioType();
    const recorder = type ? new Recorder(stream, { mimeType: type }) : new Recorder(stream);
    const chunks: Blob[] = [];
    const started = Date.now();
    recorder.addEventListener("dataavailable", (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      window.clearInterval(this._recordTimer);
      this._recorder = undefined;
      this._renderAudioEditor(true);
      if (chunks.length) {
        void this._uploadAudioFile(new Blob(chunks, { type: recorder.mimeType || type || "audio/webm" }), `memo-${Date.now()}`);
      }
    });
    this._recorder = recorder;
    recorder.start();
    this._renderAudioEditor(true);
    this._recordTimer = window.setInterval(() => {
      const seconds = Math.round((Date.now() - started) / 1000);
      this._setAudioStatus(t("recording", { seconds }));
      if (seconds >= 180 && this._recorder?.state !== "inactive") this._recorder?.stop();
    }, 500);
  }

  private _updatePreviewCard(): void {
    const card = this._previewCard;
    if (!card || !this._config) return;
    try {
      card.setConfig({ ...this._config, type: this._config.type || `custom:${CARD_TYPE}` });
      if (this._hass) card.hass = this._hass;
    } catch {
      // An incomplete config while typing; the preview keeps the last good one.
    }
  }

  private _selectPage(index: number): void {
    this._pageIndex = index;
    this._render();
  }

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
    this._moveLeftButton = q<HTMLButtonElement>(".move-left");
    this._moveRightButton = q<HTMLButtonElement>(".move-right");
    this._canvasImg = q<HTMLImageElement>(".marker-canvas img");
    this._root.querySelector<HTMLElement>(".marker-canvas")?.addEventListener("click", (ev) => this._onCanvasClick(ev));
    this._root.querySelector<HTMLButtonElement>(".import")?.addEventListener("click", () => void this._importFolder());
    this._root.querySelector<HTMLInputElement>(".import-folder")?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") void this._importFolder();
    });
    const preview = this._root.querySelector<HTMLElement>(".preview-card");
    if (preview && customElements.get(CARD_TYPE)) {
      this._previewCard = document.createElement(CARD_TYPE) as typeof this._previewCard;
      if (this._previewCard) preview.append(this._previewCard);
    }
    this._root.querySelector<HTMLButtonElement>(".play")?.addEventListener("click", () => this._previewCard?.flip());
    this._root.querySelector<HTMLButtonElement>(".record-btn")?.addEventListener("click", () => void this._toggleRecord());
    const audioFile = this._root.querySelector<HTMLInputElement>(".audio-file");
    this._root.querySelector<HTMLButtonElement>(".upload-audio")?.addEventListener("click", () => audioFile?.click());
    audioFile?.addEventListener("change", () => {
      const file = audioFile.files?.[0];
      audioFile.value = "";
      if (file) void this._uploadAudioFile(file);
    });

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
    this._moveLeftButton?.addEventListener("click", () => this._movePage(-1));
    this._moveRightButton?.addEventListener("click", () => this._movePage(1));
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
          kind === "note" ? "mdi:note-text-outline" : kind === "audio" ? "mdi:microphone-outline" : kind === "both" ? "mdi:image-text" : "mdi:image-outline",
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
    const addRow = this._root.querySelector<HTMLElement>(".add-row");
    if (addRow) {
      addRow.replaceChildren();
      for (const kind of ["image", "note", "audio"] as const) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = `chip add add-${kind}`;
        add.innerHTML = `<ha-icon icon="mdi:plus"></ha-icon><span></span>`;
        add.querySelector("span")!.textContent = t(kind === "note" ? "editor_add_note" : kind === "audio" ? "editor_add_audio" : "editor_add_page");
        add.disabled = full;
        add.addEventListener("click", () => this._addPage(kind));
        addRow.append(add);
      }
    }
    const maxNote = this._root.querySelector<HTMLElement>(".max-note");
    if (maxNote) maxNote.textContent = full ? t("editor_max_slides") : "";
    const importInput = this._root.querySelector<HTMLInputElement>(".import-folder");
    if (importInput) {
      importInput.placeholder = t("editor_import");
      importInput.title = t("editor_import_help");
      if (!importInput.value && !importInput.dataset.touched) {
        importInput.value = this._config?.upload_folder ?? (DEFAULTS.upload_folder as string);
        importInput.addEventListener("input", () => (importInput.dataset.touched = "1"), { once: true });
      }
    }
    setText(".import span", t("editor_import_button"));
    const importButton = this._root.querySelector<HTMLButtonElement>(".import");
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
          selector: { entity: { filter: [{ domain: "input_text" }, { domain: "text" }] } },
        },
      );
    }
    if (kind === "image" || hasPicture(page)) {
      schema.push(
        { name: "image", selector: { text: {} } },
        {
          name: "image_entity",
          selector: {
            entity: {
              filter: [{ domain: "image" }, { domain: "camera" }, { domain: "person" }, { domain: "input_text" }, { domain: "text" }],
            },
          },
        },
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
            context: { filter_entity: "note_entity" },
          },
        ],
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
                  ...Object.keys(NOTE_COLOR_PRESETS).map((name) => ({ value: name, label: t(`color_${name}`) })),
                ],
              },
            },
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
            name: "appearance_layout",
            type: "grid",
            flatten: true,
            schema: [
              { name: "layout", selector: { select: { mode: "dropdown", options: options(LAYOUTS, "layout") } } },
              {
                name: "columns",
                selector: { number: { min: 0, max: 8, step: 1, mode: "box" } },
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
              { name: "ken_burns", selector: { boolean: {} } },
            ],
          },
          {
            name: "appearance_notes",
            type: "grid",
            flatten: true,
            schema: [
              { name: "note_style", selector: { select: { mode: "dropdown", options: options(NOTE_STYLES, "note_style") } } },
              { name: "expired_slides", selector: { select: { mode: "dropdown", options: options(EXPIRED_MODES, "expired") } } },
            ],
          },
        ],
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
            selector: { select: { mode: "dropdown", options: options(UPLOAD_TARGETS, "upload_target") } },
          },
          { name: "upload_folder", selector: { text: {} } },
          {
            name: "upload_max_size",
            selector: { number: { min: 0, max: 8000, step: 10, mode: "box", unit_of_measurement: "px" } },
          },
          { name: "upload_crop", selector: { boolean: {} } },
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
          {
            name: "behaviour_checklist",
            type: "grid",
            flatten: true,
            schema: [
              { name: "checklist", selector: { boolean: {} } },
              { name: "checklist_writeback", selector: { boolean: {} } },
              { name: "show_camera", selector: { boolean: {} } },
              { name: "show_record", selector: { boolean: {} } },
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
      expires: page.expires ?? "",
      color: page.color ?? "",
      audio: typeof page.audio === "object" && page.audio !== null ? page.audio.media_content_id : page.audio ?? "",
      audio_entity: page.audio_entity ?? "",
    };
  }

  private _cardData(): Record<string, unknown> {
    const config = this._config ?? ({ type: "" } as PinboardCardConfig);
    const data: Record<string, unknown> = { ...DEFAULTS, ...EDITOR_DEFAULTS };
    for (const [key, value] of Object.entries(config)) {
      if (LIST_KEYS.includes(key) || ((PAGE_KEYS as string[]).includes(key) && key !== "title")) continue;
      data[key] = value;
    }
    return data;
  }

  private readonly _onPageValueChanged = (ev: CustomEvent<{ value: Record<string, unknown> }>): void => {
    ev.stopPropagation();
    if (!this._config) return;
    const value = ev.detail.value ?? {};
    const page: PageConfig = { ...this._page() };
    for (const [key, raw] of Object.entries(value)) {
      const target = key === "page_title" ? "title" : key;
      if (!(PAGE_KEYS as string[]).includes(target) || target === "kind" || target === "markers") continue;
      if (raw === undefined || raw === null || raw === "") {
        delete page[target as keyof PageConfig];
      } else {
        (page as Record<string, unknown>)[target] = raw;
      }
    }
    // The kind marker is only needed while an entry has no content of its own.
    if (page.kind === "note" && hasNote(page)) delete page.kind;
    if (page.kind === "image" && hasPicture(page)) delete page.kind;
    this._emit(this._withPage(this._pageIndex, page));
  };

  private readonly _onCardValueChanged = (ev: CustomEvent<{ value: Record<string, unknown> }>): void => {
    ev.stopPropagation();
    if (!this._config) return;
    const value = ev.detail.value ?? {};
    const next: Record<string, unknown> = { ...this._config };
    for (const [key, raw] of Object.entries(value)) {
      if (key === "type" || LIST_KEYS.includes(key) || ((PAGE_KEYS as string[]).includes(key) && key !== "title")) continue;
      const fallback =
        key in DEFAULTS ? (DEFAULTS as Record<string, unknown>)[key] : EDITOR_DEFAULTS[key];
      const isDefault =
        (key in DEFAULTS || key in EDITOR_DEFAULTS) &&
        (raw === fallback ||
          (typeof raw === "object" && raw !== null && JSON.stringify(raw) === JSON.stringify(fallback)));
      if (raw === undefined || raw === null || raw === "" || isDefault) {
        delete next[key];
      } else {
        next[key] = raw;
      }
    }
    this._emit(next as unknown as PinboardCardConfig);
  };

  private _emit(config: PinboardCardConfig): void {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined && value !== null && value !== "") cleaned[key] = value;
    }
    this._config = cleaned as unknown as PinboardCardConfig;
    this._render();
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async _upload(file: File): Promise<void> {
    const hass = this._hass;
    if (!hass || this._uploading) return;
    const t = (key: string) => translate(this._lang, key);
    this._uploading = true;
    this._setStatus(t("editor_uploading"), false);
    if (this._uploadButton) this._uploadButton.disabled = true;
    try {
      const config = this._config ?? ({} as PinboardCardConfig);
      const image = await uploadPicture(hass, file, {
        target: config.upload_target === "media" ? "media" : "image",
        folder: config.upload_folder ?? (DEFAULTS.upload_folder as string),
        maxSize: config.upload_max_size ?? DEFAULTS.upload_max_size,
        cropAspect: config.upload_crop ? (parseAspectRatio(config.aspect_ratio ?? DEFAULTS.aspect_ratio) ?? undefined) : undefined,
      });
      this._emit(this._withPage(this._pageIndex, { ...this._page(), image, image_entity: undefined }));
      this._setStatus(t("editor_upload_done"), false);
    } catch (err) {
      const code = err instanceof UploadError ? err.code : "network";
      const message =
        code === "too_large"
          ? t("editor_upload_too_large")
          : code === "forbidden"
            ? t("editor_upload_forbidden")
            : err instanceof Error
              ? err.message
              : String(err);
      this._setStatus(`${t("editor_upload_failed")}: ${message}`, true);
    } finally {
      this._uploading = false;
      if (this._uploadButton) this._uploadButton.disabled = false;
    }
  }

  private _markers(): MarkerConfig[] {
    const list = this._page().markers;
    return Array.isArray(list) ? list.map((m) => ({ ...m })) : [];
  }

  private _setMarkers(markers: MarkerConfig[]): void {
    const page = { ...this._page() };
    if (markers.length) {
      page.markers = markers;
    } else {
      delete page.markers;
    }
    this._emit(this._withPage(this._pageIndex, page));
  }

  private _onCanvasClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;
    if (target.closest(".pin")) return;
    const img = this._canvasImg;
    if (!img || !img.getAttribute("src")) return;
    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.round(Math.min(100, Math.max(0, ((ev.clientX - rect.left) / rect.width) * 100)) * 10) / 10;
    const y = Math.round(Math.min(100, Math.max(0, ((ev.clientY - rect.top) / rect.height) * 100)) * 10) / 10;
    const markers = this._markers();
    if (this._selectedMarker >= 0 && this._selectedMarker < markers.length) {
      markers[this._selectedMarker] = { ...markers[this._selectedMarker], x, y };
    } else {
      if (markers.length >= MAX_MARKERS) return;
      markers.push({ x, y });
      this._selectedMarker = markers.length - 1;
    }
    this._setMarkers(markers);
  }

  private _renderMarkers(show: boolean): void {
    const section = this._root.querySelector<HTMLElement>(".markers-editor");
    const pins = this._root.querySelector<HTMLElement>(".marker-canvas .pins");
    const list = this._root.querySelector<HTMLElement>(".marker-list");
    if (!section || !pins || !list) return;
    const t = (key: string) => translate(this._lang, key);
    const page = this._page();
    const hasPicture = Boolean(page.image) || Boolean(page.image_entity);
    section.classList.toggle("hidden", !show || !hasPicture);
    if (!show || !hasPicture) return;
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
      const field = (key: "label" | "icon" | "entity", placeholder: string) => {
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
        remove,
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
