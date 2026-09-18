import {
  CARD_TYPE,
  EDITOR_TYPE,
  MEDIA_EXPIRES_SECONDS,
  MEDIA_REFRESH_MS,
  MEDIA_SOURCE_PREFIX,
  NOTE_ENTITY_DOMAINS,
  SAMPLE_IMAGE,
} from "./const";
import { normalizeConfig, parseAspectRatio, validateConfig } from "./config";
import { resolveLanguage, translate } from "./i18n";
import { CARD_STYLES } from "./styles";
import type {
  HassEntity,
  HomeAssistant,
  ImageNoteCardConfig,
  NormalizedConfig,
  ResolvedMedia,
  Side,
  Transition,
} from "./types";

interface Elements {
  card: HTMLElement;
  stage: HTMLElement;
  scene: HTMLElement;
  front: HTMLElement;
  back: HTMLElement;
  img: HTMLImageElement;
  placeholder: HTMLElement;
  placeholderTitle: HTMLElement;
  placeholderHelp: HTMLElement;
  placeholderIcon: HTMLElement;
  titleOverlay: HTMLElement;
  frontBadge: HTMLElement;
  frontBadgeLabel: HTMLElement;
  backBadge: HTMLElement;
  backBadgeLabel: HTMLElement;
  noteHeader: HTMLElement;
  noteTitle: HTMLElement;
  editButton: HTMLButtonElement;
  noteBody: HTMLElement;
  noteEditor: HTMLElement;
  textarea: HTMLTextAreaElement;
  errorText: HTMLElement;
  counter: HTMLElement;
  saveButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
}

interface NoteSource {
  text: string;
  editable: boolean;
  error: string;
  max: number | null;
  domain: string;
}

const TEMPLATE = `
<style>${CARD_STYLES}</style>
<ha-card>
  <div class="stage" tabindex="0" role="button" aria-pressed="false">
    <div class="scene">
      <div class="face front">
        <img alt="" draggable="false" />
        <div class="placeholder">
          <ha-icon icon="mdi:image-plus-outline"></ha-icon>
          <strong></strong>
          <small></small>
        </div>
        <div class="title-overlay"></div>
        <div class="badge front-badge"><ha-icon icon="mdi:note-text-outline"></ha-icon><span></span></div>
      </div>
      <div class="face back">
        <div class="note-header">
          <ha-icon icon="mdi:note-text-outline"></ha-icon>
          <span class="title"></span>
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
        <div class="badge back-badge"><ha-icon icon="mdi:image-outline"></ha-icon><span></span></div>
      </div>
    </div>
  </div>
</ha-card>`;

function isMediaSourceId(value: string): boolean {
  return value.startsWith(MEDIA_SOURCE_PREFIX);
}

export class ImageNoteCard extends HTMLElement {
  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TYPE);
  }

  static getStubConfig(): ImageNoteCardConfig {
    return {
      type: `custom:${CARD_TYPE}`,
      title: "ImageNote",
      image: SAMPLE_IMAGE,
      note: "**Hello!** Tap the picture to read this note.\n\nMarkdown works here: lists, links, *emphasis*.",
    };
  }

  private readonly _root: ShadowRoot;
  private _config?: NormalizedConfig;
  private _hass?: HomeAssistant;
  private _lang = "en";
  private _side: Side = "image";
  private _editing = false;
  private _saving = false;
  private _els?: Elements;
  private _imageFailed = false;
  private _mediaPending = false;
  private _resolveToken = 0;
  private _refreshTimer?: number;
  private _autoFlipTimer?: number;
  private _resizeObserver?: ResizeObserver;
  private readonly _motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly _hoverQuery = window.matchMedia("(hover: hover)");
  private _lastNote?: NoteSource;
  private _lastImageSrc?: string;
  private _markdownReady = customElements.get("ha-markdown") !== undefined;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._ensureMarkdown();
  }

  // ---------------------------------------------------------------- lifecycle

  connectedCallback(): void {
    this._motionQuery.addEventListener("change", this._onMotionChange);
    this._observeResize();
    this._startAutoFlip();
  }

  disconnectedCallback(): void {
    this._motionQuery.removeEventListener("change", this._onMotionChange);
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._stopAutoFlip();
    window.clearTimeout(this._refreshTimer);
  }

  setConfig(config: ImageNoteCardConfig): void {
    validateConfig(config);
    this._config = normalizeConfig(config);
    this._side = this._config.default_side;
    this._editing = false;
    this._saving = false;
    this._lastNote = undefined;
    this._lastImageSrc = undefined;
    this._imageFailed = false;
    this._build();
    this._applyConfig();
    this._resolveImage();
    this._applyHass();
    this._observeResize();
    this._startAutoFlip();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    const lang = resolveLanguage(hass);
    if (lang !== this._lang) {
      this._lang = lang;
      this._applyStrings();
    }
    if (this._mediaPending) {
      this._resolveImage();
    }
    this._applyHass();
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  getCardSize(): number {
    return 4;
  }

  getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 4, min_columns: 3, min_rows: 2 };
  }

  /** Public helper so automations / other cards can flip the card programmatically. */
  flip(side?: Side): void {
    if (this._editing) return;
    this._setSide(side ?? (this._side === "image" ? "note" : "image"));
    this._restartAutoFlip();
  }

  // ---------------------------------------------------------------- rendering

  private _build(): void {
    this._root.innerHTML = TEMPLATE;
    const q = <T extends Element>(selector: string): T => {
      const el = this._root.querySelector<T>(selector);
      if (!el) throw new Error(`ImageNote: missing element ${selector}`);
      return el;
    };
    this._els = {
      card: q("ha-card"),
      stage: q(".stage"),
      scene: q(".scene"),
      front: q(".front"),
      back: q(".back"),
      img: q("img"),
      placeholder: q(".placeholder"),
      placeholderTitle: q(".placeholder strong"),
      placeholderHelp: q(".placeholder small"),
      placeholderIcon: q(".placeholder ha-icon"),
      titleOverlay: q(".title-overlay"),
      frontBadge: q(".front-badge"),
      frontBadgeLabel: q(".front-badge span"),
      backBadge: q(".back-badge"),
      backBadgeLabel: q(".back-badge span"),
      noteHeader: q(".note-header"),
      noteTitle: q(".note-header .title"),
      editButton: q(".edit"),
      noteBody: q(".note-body"),
      noteEditor: q(".note-editor"),
      textarea: q("textarea"),
      errorText: q(".error-text"),
      counter: q(".counter"),
      saveButton: q(".save"),
      cancelButton: q(".cancel"),
    };
    const els = this._els;

    els.stage.addEventListener("click", this._onStageClick);
    els.stage.addEventListener("keydown", this._onStageKeydown);
    els.stage.addEventListener("mouseenter", this._onMouseEnter);
    els.stage.addEventListener("mouseleave", this._onMouseLeave);
    els.img.addEventListener("error", this._onImageError);
    els.img.addEventListener("load", this._onImageLoad);
    els.editButton.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this._startEdit();
    });
    els.noteEditor.addEventListener("click", (ev) => ev.stopPropagation());
    els.noteEditor.addEventListener("keydown", (ev) => ev.stopPropagation());
    els.textarea.addEventListener("input", () => this._updateCounter());
    els.textarea.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        this._cancelEdit();
      } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        void this._saveEdit();
      }
    });
    els.cancelButton.addEventListener("click", () => this._cancelEdit());
    els.saveButton.addEventListener("click", () => void this._saveEdit());

    this._applyStrings();
  }

  private _applyConfig(): void {
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
    this._applyTransition();

    els.scene.classList.toggle("hover-flip", config.hover_flip);

    const showTitle = config.show_title && config.title !== "";
    els.titleOverlay.textContent = config.title;
    els.titleOverlay.classList.toggle("hidden", !showTitle);
    els.noteTitle.textContent = config.title || translate(this._lang, "note");
    els.noteHeader.classList.toggle("no-title", config.title === "");
    els.frontBadge.classList.toggle("hidden", !config.show_hint);
    els.backBadge.classList.toggle("hidden", !config.show_hint);

    this._applySide();
  }

  private _applyTransition(): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const reduced = this._motionQuery.matches;
    const transition: Transition = reduced && config.transition !== "none" ? "fade" : config.transition;
    const duration = reduced ? Math.min(config.duration, 200) : config.duration;
    els.scene.classList.remove("flip", "fade", "slide", "cube", "none", "horizontal", "vertical");
    els.scene.classList.add(transition, config.direction);
    this.style.setProperty("--imagenote-duration", `${duration}ms`);
    this._updateDepth();
  }

  private _applyStrings(): void {
    const els = this._els;
    if (!els) return;
    const t = (key: string) => translate(this._lang, key);
    els.frontBadgeLabel.textContent = t("note");
    els.backBadgeLabel.textContent = t("photo");
    els.editButton.title = t("editNote");
    els.editButton.setAttribute("aria-label", t("editNote"));
    els.cancelButton.textContent = t("cancel");
    els.saveButton.textContent = this._saving ? t("saving") : t("save");
    if (this._config && !this._config.title) {
      els.noteTitle.textContent = t("note");
    }
    this._updatePlaceholder();
    this._applySide();
    // Re-render the note so empty-state texts follow the language.
    this._lastNote = undefined;
    this._applyHass();
  }

  private _applySide(): void {
    const els = this._els;
    if (!els) return;
    const flipped = this._side === "note";
    els.scene.classList.toggle("flipped", flipped);
    els.stage.setAttribute("aria-pressed", String(flipped));
    const title = this._config?.title ? `${this._config.title} – ` : "";
    els.stage.setAttribute(
      "aria-label",
      title + translate(this._lang, flipped ? "showPhoto" : "showNote"),
    );
  }

  private _setSide(side: Side): void {
    if (side === this._side) return;
    this._side = side;
    this._applySide();
    this.dispatchEvent(
      new CustomEvent("imagenote-flip", { detail: { side }, bubbles: true, composed: true }),
    );
  }

  // ---------------------------------------------------------------- picture

  private _imageSourceFromEntity(): string | undefined {
    const config = this._config;
    if (!config?.image_entity || !this._hass) return undefined;
    const entity = this._hass.states[config.image_entity];
    if (!entity) return undefined;
    const picture = entity.attributes.entity_picture;
    if (typeof picture !== "string" || !picture) return undefined;
    const domain = config.image_entity.split(".")[0];
    if (domain === "image" || domain === "camera") {
      // Cache-bust when the entity updates so the card shows the latest frame.
      const join = picture.includes("?") ? "&" : "?";
      return `${picture}${join}state=${encodeURIComponent(entity.state)}`;
    }
    return picture;
  }

  private _resolveImage(): void {
    const config = this._config;
    if (!config) return;
    const token = ++this._resolveToken;
    window.clearTimeout(this._refreshTimer);
    this._imageFailed = false;
    this._mediaPending = false;

    const fromEntity = this._imageSourceFromEntity();
    if (config.image_entity) {
      this._setImage(fromEntity ?? "");
      return;
    }

    const image = config.image;
    if (!image) {
      this._setImage("");
      return;
    }

    let mediaId: string | undefined;
    if (typeof image === "string") {
      if (!isMediaSourceId(image)) {
        this._setImage(image);
        return;
      }
      mediaId = image;
    } else {
      mediaId = image.media_content_id;
    }

    if (!this._hass) {
      this._mediaPending = true;
      this._setImage("");
      return;
    }

    void this._hass
      .callWS<ResolvedMedia>({
        type: "media_source/resolve_media",
        media_content_id: mediaId,
        expires: MEDIA_EXPIRES_SECONDS,
      })
      .then((result) => {
        if (token !== this._resolveToken) return;
        this._setImage(result.url);
        this._refreshTimer = window.setTimeout(() => this._resolveImage(), MEDIA_REFRESH_MS);
      })
      .catch(() => {
        if (token !== this._resolveToken) return;
        this._imageFailed = true;
        this._setImage("");
      });
  }

  private _setImage(src: string): void {
    const els = this._els;
    if (!els) return;
    if (src === this._lastImageSrc && !this._imageFailed) {
      return;
    }
    this._lastImageSrc = src;
    if (src) {
      els.img.src = src;
      els.img.classList.remove("hidden");
    } else {
      els.img.removeAttribute("src");
      els.img.classList.add("hidden");
    }
    this._updatePlaceholder();
  }

  private _updatePlaceholder(): void {
    const els = this._els;
    if (!els) return;
    const hasImage = Boolean(this._lastImageSrc) && !this._imageFailed;
    els.placeholder.classList.toggle("hidden", hasImage);
    els.img.classList.toggle("hidden", !hasImage);
    const t = (key: string) => translate(this._lang, key);
    if (this._imageFailed) {
      els.placeholderIcon.setAttribute("icon", "mdi:image-broken-variant");
      els.placeholderTitle.textContent = t("imageError");
      els.placeholderHelp.textContent = "";
    } else {
      els.placeholderIcon.setAttribute("icon", "mdi:image-plus-outline");
      els.placeholderTitle.textContent = t("noImage");
      els.placeholderHelp.textContent = t("noImageHelp");
    }
  }

  private readonly _onImageError = (): void => {
    if (!this._lastImageSrc) return;
    this._imageFailed = true;
    this._updatePlaceholder();
  };

  private readonly _onImageLoad = (): void => {
    this._imageFailed = false;
    this._updatePlaceholder();
    this._updateDepth();
  };

  // ---------------------------------------------------------------- note

  private _noteSource(): NoteSource {
    const config = this._config;
    const empty: NoteSource = { text: "", editable: false, error: "", max: null, domain: "" };
    if (!config) return empty;
    if (!config.note_entity) {
      return { ...empty, text: config.note };
    }
    const entity: HassEntity | undefined = this._hass?.states[config.note_entity];
    if (!entity) {
      return {
        ...empty,
        error: this._hass
          ? translate(this._lang, "entityMissing", { entity: config.note_entity })
          : "",
      };
    }
    const domain = config.note_entity.split(".")[0];
    const attr = config.note_attribute;
    let text: string;
    if (attr) {
      const raw = entity.attributes[attr];
      text = raw === undefined || raw === null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw);
    } else {
      text = entity.state === "unknown" || entity.state === "unavailable" ? "" : entity.state;
    }
    const max = typeof entity.attributes.max === "number" ? entity.attributes.max : null;
    return {
      text,
      editable: !attr && NOTE_ENTITY_DOMAINS.includes(domain),
      error: "",
      max,
      domain,
    };
  }

  private _applyHass(): void {
    const els = this._els;
    if (!els || !this._config) return;

    if (this._config.image_entity) {
      const src = this._imageSourceFromEntity() ?? "";
      if (src !== this._lastImageSrc) {
        this._imageFailed = false;
        this._setImage(src);
      }
    }

    const source = this._noteSource();
    const last = this._lastNote;
    if (
      last &&
      last.text === source.text &&
      last.editable === source.editable &&
      last.error === source.error &&
      last.max === source.max
    ) {
      return;
    }
    this._lastNote = source;
    els.editButton.classList.toggle("hidden", !source.editable || this._editing);
    if (!this._editing) {
      this._renderNote(source);
    }
  }

  private _renderNote(source: NoteSource): void {
    const els = this._els;
    if (!els) return;
    const body = els.noteBody;
    body.replaceChildren();
    const t = (key: string) => translate(this._lang, key);

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
    if (this._markdownReady) {
      const md = document.createElement("ha-markdown") as HTMLElement & {
        content?: string;
        breaks?: boolean;
      };
      md.setAttribute("breaks", "");
      md.breaks = true;
      md.content = source.text;
      body.append(md);
    } else {
      const div = document.createElement("div");
      div.className = "note-text";
      div.textContent = source.text;
      body.append(div);
    }
  }

  private _ensureMarkdown(): void {
    if (this._markdownReady) return;
    // The markdown card pulls in <ha-markdown>; creating one makes HA load it lazily.
    window
      .loadCardHelpers?.()
      .then((helpers) => {
        helpers.createCardElement({ type: "markdown", content: " " });
      })
      .catch(() => undefined);
    void customElements.whenDefined("ha-markdown").then(() => {
      this._markdownReady = true;
      if (this._lastNote && !this._editing) {
        this._renderNote(this._lastNote);
      }
    });
  }

  // ---------------------------------------------------------------- editing

  private _startEdit(): void {
    const els = this._els;
    const source = this._lastNote ?? this._noteSource();
    if (!els || !source.editable || !this._hass) return;
    this._editing = true;
    this._stopAutoFlip();
    this._setSide("note");
    els.scene.classList.add("editing");
    els.noteBody.style.display = "none";
    els.editButton.classList.add("hidden");
    els.noteEditor.classList.add("visible");
    els.errorText.textContent = "";
    els.textarea.value = source.text;
    if (source.max) {
      els.textarea.maxLength = source.max;
    } else {
      els.textarea.removeAttribute("maxlength");
    }
    this._updateCounter();
    els.textarea.focus();
    els.textarea.setSelectionRange(els.textarea.value.length, els.textarea.value.length);
  }

  private _finishEdit(): void {
    const els = this._els;
    if (!els) return;
    this._editing = false;
    this._saving = false;
    els.scene.classList.remove("editing");
    els.noteBody.style.display = "";
    els.noteEditor.classList.remove("visible");
    els.saveButton.disabled = false;
    els.cancelButton.disabled = false;
    els.saveButton.textContent = translate(this._lang, "save");
    const source = this._noteSource();
    this._lastNote = source;
    els.editButton.classList.toggle("hidden", !source.editable);
    this._renderNote(source);
    this._startAutoFlip();
    els.stage.focus({ preventScroll: true });
  }

  private _cancelEdit(): void {
    if (!this._editing || this._saving) return;
    this._finishEdit();
  }

  private async _saveEdit(): Promise<void> {
    const els = this._els;
    const config = this._config;
    if (!els || !config || !this._hass || !this._editing || this._saving) return;
    const source = this._lastNote ?? this._noteSource();
    const value = els.textarea.value;
    if (value === source.text) {
      this._finishEdit();
      return;
    }
    this._saving = true;
    els.saveButton.disabled = true;
    els.cancelButton.disabled = true;
    els.saveButton.textContent = translate(this._lang, "saving");
    els.errorText.textContent = "";
    try {
      await this._hass.callService(source.domain, "set_value", {
        entity_id: config.note_entity,
        value,
      });
      // Show the new text immediately; the state update will confirm it shortly.
      this._lastNote = { ...source, text: value };
      this._finishEdit();
      this._renderNote(this._lastNote);
    } catch (err) {
      this._saving = false;
      els.saveButton.disabled = false;
      els.cancelButton.disabled = false;
      els.saveButton.textContent = translate(this._lang, "save");
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
      els.errorText.textContent = `${translate(this._lang, "saveFailed")}${message ? `: ${message}` : ""}`;
    }
  }

  private _updateCounter(): void {
    const els = this._els;
    if (!els) return;
    const max = this._lastNote?.max ?? null;
    if (!max) {
      els.counter.textContent = "";
      return;
    }
    const left = max - els.textarea.value.length;
    els.counter.textContent = translate(this._lang, "charsLeft", { count: left });
    els.counter.classList.toggle("over", left < 0);
  }

  // ---------------------------------------------------------------- interaction

  private readonly _onStageClick = (ev: MouseEvent): void => {
    if (this._editing) return;
    const path = ev.composedPath();
    for (const node of path) {
      if (node instanceof HTMLAnchorElement || node instanceof HTMLButtonElement) return;
      if (node === this._els?.noteEditor) return;
    }
    const root = this._root as ShadowRoot & { getSelection?: () => Selection | null };
    const selection = root.getSelection ? root.getSelection() : window.getSelection();
    if (selection && selection.toString().length > 0) return;
    this.flip();
  };

  private readonly _onStageKeydown = (ev: KeyboardEvent): void => {
    if (this._editing) return;
    if (ev.target !== this._els?.stage) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this.flip();
    }
  };

  private readonly _onMouseEnter = (): void => {
    if (!this._config?.hover_flip || !this._hoverQuery.matches || this._editing) return;
    this._setSide("note");
  };

  private readonly _onMouseLeave = (): void => {
    if (!this._config?.hover_flip || !this._hoverQuery.matches || this._editing) return;
    this._setSide(this._config.default_side);
  };

  private readonly _onMotionChange = (): void => {
    this._applyTransition();
  };

  // ---------------------------------------------------------------- timers & layout

  private _startAutoFlip(): void {
    this._stopAutoFlip();
    const seconds = this._config?.auto_flip ?? 0;
    if (!this.isConnected || seconds <= 0) return;
    this._autoFlipTimer = window.setInterval(() => {
      if (this._editing) return;
      this._setSide(this._side === "image" ? "note" : "image");
    }, seconds * 1000);
  }

  private _stopAutoFlip(): void {
    if (this._autoFlipTimer !== undefined) {
      window.clearInterval(this._autoFlipTimer);
      this._autoFlipTimer = undefined;
    }
  }

  private _restartAutoFlip(): void {
    if (this._autoFlipTimer !== undefined) {
      this._startAutoFlip();
    }
  }

  private _observeResize(): void {
    if (!this._els || typeof ResizeObserver === "undefined") return;
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(() => this._updateDepth());
    this._resizeObserver.observe(this._els.stage);
  }

  /** The cube transition needs half the stage size as its rotation depth. */
  private _updateDepth(): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const rect = els.stage.getBoundingClientRect();
    const size = config.direction === "vertical" ? rect.height : rect.width;
    if (size > 0) {
      els.scene.style.setProperty("--imagenote-depth", `${size / 2}px`);
    }
  }
}
