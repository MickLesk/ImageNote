import {
  CARD_TYPE,
  DOUBLE_TAP_WINDOW_MS,
  EDITOR_TYPE,
  HOLD_DELAY_MS,
  MEDIA_EXPIRES_SECONDS,
  MEDIA_REFRESH_MS,
  MEDIA_SOURCE_PREFIX,
  NOTE_ENTITY_DOMAINS,
  SAMPLE_IMAGE,
  SWIPE_THRESHOLD_PX,
  TILE_MIN_WIDTH_PX,
} from "./const";
import { GestureDetector, runAction, type ActionKind, type SwipeDirection } from "./actions";
import { normalizeConfig, parseAspectRatio, validateConfig } from "./config";
import { resolveLanguage, translate } from "./i18n";
import { CARD_STYLES } from "./styles";
import { formatRelativeTime } from "./time";
import type {
  HassEntity,
  HomeAssistant,
  ImageNoteCardConfig,
  NormalizedConfig,
  NormalizedPage,
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
  imgA: HTMLImageElement;
  imgB: HTMLImageElement;
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
  noteMeta: HTMLElement;
  noteFooter: HTMLElement;
  noteEditor: HTMLElement;
  textarea: HTMLTextAreaElement;
  errorText: HTMLElement;
  counter: HTMLElement;
  saveButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  navButtons: HTMLButtonElement[];
  dots: HTMLElement[];
}

interface NoteSource {
  text: string;
  editable: boolean;
  error: string;
  max: number | null;
  domain: string;
  changed: string;
  entityId: string;
}

interface ResolvedImage {
  url: string;
  failed: boolean;
  expiresAt: number;
}

const CHEVRON_LEFT = "mdi:chevron-left";
const CHEVRON_RIGHT = "mdi:chevron-right";

const NAV_TEMPLATE = `
  <button class="nav prev" type="button"><ha-icon icon="${CHEVRON_LEFT}"></ha-icon></button>
  <button class="nav next" type="button"><ha-icon icon="${CHEVRON_RIGHT}"></ha-icon></button>
  <div class="dots"></div>`;

const TEMPLATE = `
<style>${CARD_STYLES}</style>
<ha-card>
  <div class="stage" tabindex="0" role="button" aria-pressed="false">
    <div class="scene">
      <div class="face front">
        <img class="layer-a" alt="" draggable="false" />
        <img class="layer-b" alt="" draggable="false" />
        <div class="placeholder">
          <ha-icon icon="mdi:image-plus-outline"></ha-icon>
          <strong></strong>
          <small></small>
        </div>
        <div class="title-overlay"></div>
        ${NAV_TEMPLATE}
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
        <div class="note-footer">
          <div class="note-meta"></div>
          <div class="spacer"></div>
          <div class="dots"></div>
          <div class="badge back-badge"><ha-icon icon="mdi:image-outline"></ha-icon><span></span></div>
        </div>
        <button class="nav prev" type="button"><ha-icon icon="${CHEVRON_LEFT}"></ha-icon></button>
        <button class="nav next" type="button"><ha-icon icon="${CHEVRON_RIGHT}"></ha-icon></button>
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
  private _index = 0;
  private _editing = false;
  private _saving = false;
  private _els?: Elements;
  private _activeLayer: "a" | "b" = "a";
  private _resolved = new Map<number, ResolvedImage>();
  private _resolveToken = 0;
  private _mediaPending = false;
  private _refreshTimer?: number;
  private _autoFlipTimer?: number;
  private _autoAdvanceTimer?: number;
  private _resizeObserver?: ResizeObserver;
  private readonly _motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly _hoverQuery = window.matchMedia("(hover: hover)");
  private _lastNote?: NoteSource;
  private _lastImageSrc?: string;
  private _gestures?: GestureDetector;
  private _metaTimer?: number;
  private _markdownReady = customElements.get("ha-markdown") !== undefined;
  private _tiles?: ImageNoteCard[];

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._ensureMarkdown();
  }

  // ---------------------------------------------------------------- lifecycle

  connectedCallback(): void {
    this._motionQuery.addEventListener("change", this._onMotionChange);
    this._observeResize();
    this._startTimers();
    this._startMetaTimer();
  }

  disconnectedCallback(): void {
    this._motionQuery.removeEventListener("change", this._onMotionChange);
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._stopTimers();
    window.clearTimeout(this._refreshTimer);
    window.clearInterval(this._metaTimer);
    this._metaTimer = undefined;
  }

  setConfig(config: ImageNoteCardConfig): void {
    validateConfig(config);
    this._config = normalizeConfig(config);
    this._stopTimers();
    this._gestures?.destroy();
    this._gestures = undefined;
    this._els = undefined;
    this._tiles = undefined;
    if (this._config.layout === "grid" && this._config.pages.length > 1) {
      this._buildTiles(config);
      return;
    }
    this._side = this._config.default_side;
    this._index = 0;
    this._editing = false;
    this._saving = false;
    this._lastNote = undefined;
    this._lastImageSrc = undefined;
    this._resolved.clear();
    this._activeLayer = "a";
    this._build();
    this._applyConfig();
    this._showPage(0, true);
    this._observeResize();
    this._startTimers();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    const lang = resolveLanguage(hass);
    if (lang !== this._lang) {
      this._lang = lang;
      this._applyStrings();
    }
    if (this._tiles) {
      for (const tile of this._tiles) tile.hass = hass;
      return;
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
    if (this._tiles) {
      const perRow = this._config?.columns || Math.min(this._tiles.length, 2);
      const tileRows = Math.ceil(this._tiles.length / perRow);
      return { columns: 12, rows: 4 * tileRows, min_columns: 6, min_rows: 2 * tileRows };
    }
    return { columns: 6, rows: 4, min_columns: 4, min_rows: 2 };
  }

  /** Public helper so automations / other cards can flip the card programmatically. */
  flip(side?: Side): void {
    if (this._tiles) {
      for (const tile of this._tiles) tile.flip(side);
      return;
    }
    if (this._editing) return;
    this._setSide(side ?? (this._side === "image" ? "note" : "image"));
    this._restartTimers();
  }

  /** Go to a picture by index (wraps around), or one step with "next" / "prev". */
  goTo(target: number | "next" | "prev"): void {
    const config = this._config;
    if (!config || this._editing) return;
    const total = config.pages.length;
    if (total < 2) return;
    let index: number;
    if (target === "next") index = (this._index + 1) % total;
    else if (target === "prev") index = (this._index - 1 + total) % total;
    else index = ((Math.trunc(target) % total) + total) % total;
    if (index === this._index) return;
    this._showPage(index);
    this._restartTimers();
  }

  get page(): NormalizedPage | undefined {
    return this._config?.pages[this._index];
  }

  // ---------------------------------------------------------------- tiles

  /** layout: grid — every picture becomes its own tile, each a full card of its own. */
  private _buildTiles(raw: ImageNoteCardConfig): void {
    const config = this._config;
    if (!config) return;
    this._root.innerHTML = `<style>${CARD_STYLES}</style><ha-card class="tiles-card"><div class="tiles-header hidden"></div><div class="tiles"></div></ha-card>`;
    const header = this._root.querySelector<HTMLElement>(".tiles-header");
    const grid = this._root.querySelector<HTMLElement>(".tiles");
    if (!header || !grid) return;
    if (config.title && config.show_title) {
      header.textContent = config.title;
      header.classList.remove("hidden");
    }
    grid.style.setProperty("--imagenote-tile-min", `${TILE_MIN_WIDTH_PX}px`);
    if (config.columns > 0) {
      grid.classList.add("fixed-columns");
      grid.style.setProperty("--imagenote-columns", String(config.columns));
    }
    const shared: Partial<ImageNoteCardConfig> = { ...raw };
    for (const key of ["images", "image", "image_entity", "note", "note_entity", "note_attribute", "title", "layout", "columns"] as const) {
      delete shared[key];
    }
    this._tiles = config.pages.map((page) => {
      const tile = document.createElement(CARD_TYPE) as ImageNoteCard;
      tile.setConfig({
        ...shared,
        type: raw.type,
        layout: "stack",
        title: page.title,
        image: page.image,
        image_entity: page.image_entity,
        note: page.note,
        note_entity: page.note_entity,
        note_attribute: page.note_attribute,
      });
      if (this._hass) tile.hass = this._hass;
      grid.append(tile);
      return tile;
    });
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
      imgA: q("img.layer-a"),
      imgB: q("img.layer-b"),
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
      noteMeta: q(".note-meta"),
      noteFooter: q(".note-footer"),
      noteEditor: q(".note-editor"),
      textarea: q("textarea"),
      errorText: q(".error-text"),
      counter: q(".counter"),
      saveButton: q(".save"),
      cancelButton: q(".cancel"),
      navButtons: Array.from(this._root.querySelectorAll<HTMLButtonElement>(".nav")),
      dots: Array.from(this._root.querySelectorAll<HTMLElement>(".dots")),
    };
    const els = this._els;

    this._gestures?.destroy();
    this._gestures = new GestureDetector(els.stage, (kind) => void this._handleGesture(kind), {
      holdDelay: HOLD_DELAY_MS,
      doubleTapWindow: DOUBLE_TAP_WINDOW_MS,
      swipeThreshold: SWIPE_THRESHOLD_PX,
      hasDoubleTap: () => this._config?.double_tap_action.action !== "none",
      enabled: (ev) => this._gestureAllowed(ev),
      onSwipe: (direction) => this._onSwipe(direction),
    });
    els.stage.addEventListener("keydown", this._onStageKeydown);
    els.stage.addEventListener("mouseenter", this._onMouseEnter);
    els.stage.addEventListener("mouseleave", this._onMouseLeave);
    for (const img of [els.imgA, els.imgB]) {
      img.addEventListener("error", () => this._onImageError(img));
      img.addEventListener("load", () => this._onImageLoad(img));
    }
    els.editButton.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this._startEdit();
    });
    for (const button of els.navButtons) {
      button.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.goTo(button.classList.contains("next") ? "next" : "prev");
      });
    }
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
    els.noteBody.addEventListener("scroll", () => this._updateScrollState(), { passive: true });

    this._buildDots();
    this._applyStrings();
  }

  private _buildDots(): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const total = config.pages.length;
    const show = total > 1 && config.show_navigation;
    for (const container of els.dots) {
      container.replaceChildren();
      container.classList.toggle("hidden", !show);
      if (!show) continue;
      for (let i = 0; i < total; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.goTo(i);
        });
        container.append(dot);
      }
    }
    for (const button of els.navButtons) {
      button.classList.toggle("hidden", !show);
    }
    els.titleOverlay.classList.toggle("with-dots", show);
    this._updateFooter();
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
    els.frontBadge.classList.toggle("hidden", !config.show_hint);
    els.backBadge.classList.toggle("hidden", !config.show_hint);
    this._applySide();
    this._updateFooter();
  }

  private _updateFooter(): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const hasMeta = !els.noteMeta.classList.contains("hidden") && els.noteMeta.textContent !== "";
    const hasDots = config.pages.length > 1 && config.show_navigation;
    els.noteFooter.classList.toggle("hidden", this._editing || (!hasMeta && !hasDots && !config.show_hint));
    this._updateScrollState();
  }

  /** Marks the note side as scrollable so the footer can fade the text out above it. */
  private _updateScrollState(): void {
    const els = this._els;
    if (!els) return;
    const body = els.noteBody;
    const scrollable = body.scrollHeight > body.clientHeight + 1;
    const atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
    els.back.classList.toggle("scrollable", scrollable);
    els.back.classList.toggle("at-end", atEnd);
  }

  private _applyTitles(): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const title = this.page?.title || config.title;
    const showTitle = config.show_title && title !== "";
    els.titleOverlay.textContent = title;
    els.titleOverlay.classList.toggle("hidden", !showTitle);
    els.noteTitle.textContent = title || translate(this._lang, "note");
    els.noteHeader.classList.toggle("no-title", title === "");
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
    for (const button of els.navButtons) {
      const label = t(button.classList.contains("next") ? "nextPicture" : "previousPicture");
      button.title = label;
      button.setAttribute("aria-label", label);
    }
    this._applyTitles();
    this._updatePlaceholder();
    this._applySide();
    // Re-render the note so empty-state texts follow the language.
    this._lastNote = undefined;
    this._applyHass();
  }

  private _applySide(): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const flipped = this._side === "note";
    els.scene.classList.toggle("flipped", flipped);
    els.stage.setAttribute("aria-pressed", String(flipped));
    const title = this.page?.title || config.title;
    const parts: string[] = [];
    if (title) parts.push(title);
    if (config.pages.length > 1) {
      parts.push(translate(this._lang, "page", { index: this._index + 1, total: config.pages.length }));
    }
    parts.push(translate(this._lang, flipped ? "showPhoto" : "showNote"));
    els.stage.setAttribute("aria-label", parts.join(" – "));
  }

  private _setSide(side: Side): void {
    if (side === this._side) return;
    this._side = side;
    this._applySide();
    this.dispatchEvent(
      new CustomEvent("imagenote-flip", { detail: { side, index: this._index }, bubbles: true, composed: true }),
    );
  }

  // ---------------------------------------------------------------- pages

  private _showPage(index: number, initial = false): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    this._index = index;
    for (const container of els.dots) {
      Array.from(container.children).forEach((dot, i) => dot.classList.toggle("active", i === index));
    }
    this._applyTitles();
    this._applySide();
    this._lastNote = undefined;
    this._lastImageSrc = undefined;
    this._resolveImage();
    this._applyHass();
    if (!initial) {
      this.dispatchEvent(
        new CustomEvent("imagenote-page", { detail: { index }, bubbles: true, composed: true }),
      );
    }
  }

  private _onSwipe(direction: SwipeDirection): void {
    if (!this._config || this._config.pages.length < 2 || this._editing) return;
    this.goTo(direction === "left" ? "next" : "prev");
  }

  // ---------------------------------------------------------------- picture

  private _imageSourceFromEntity(page: NormalizedPage): string | undefined {
    if (!page.image_entity || !this._hass) return undefined;
    const entity = this._hass.states[page.image_entity];
    if (!entity) return undefined;
    const picture = entity.attributes.entity_picture;
    if (typeof picture !== "string" || !picture) return undefined;
    const domain = page.image_entity.split(".")[0];
    if (domain === "image" || domain === "camera") {
      // Cache-bust when the entity updates so the card shows the latest frame.
      const join = picture.includes("?") ? "&" : "?";
      return `${picture}${join}state=${encodeURIComponent(entity.state)}`;
    }
    return picture;
  }

  private _resolveImage(): void {
    const page = this.page;
    if (!page) return;
    const index = this._index;
    const token = ++this._resolveToken;
    window.clearTimeout(this._refreshTimer);
    this._mediaPending = false;

    if (page.image_entity) {
      this._setImage(this._imageSourceFromEntity(page) ?? "", false);
      return;
    }

    const image = page.image;
    if (!image) {
      this._setImage("", false);
      return;
    }

    let mediaId: string | undefined;
    if (typeof image === "string") {
      if (!isMediaSourceId(image)) {
        this._setImage(image, false);
        return;
      }
      mediaId = image;
    } else {
      mediaId = image.media_content_id;
    }

    const cached = this._resolved.get(index);
    if (cached && !cached.failed && cached.expiresAt > Date.now()) {
      this._setImage(cached.url, false);
      this._scheduleRefresh(cached.expiresAt);
      return;
    }

    if (!this._hass) {
      this._mediaPending = true;
      this._setImage("", false);
      return;
    }

    void this._hass
      .callWS<ResolvedMedia>({
        type: "media_source/resolve_media",
        media_content_id: mediaId,
        expires: MEDIA_EXPIRES_SECONDS,
      })
      .then((result) => {
        const expiresAt = Date.now() + MEDIA_REFRESH_MS;
        this._resolved.set(index, { url: result.url, failed: false, expiresAt });
        if (token !== this._resolveToken) return;
        this._setImage(result.url, false);
        this._scheduleRefresh(expiresAt);
      })
      .catch(() => {
        this._resolved.set(index, { url: "", failed: true, expiresAt: 0 });
        if (token !== this._resolveToken) return;
        this._setImage("", true);
      });
  }

  private _scheduleRefresh(expiresAt: number): void {
    window.clearTimeout(this._refreshTimer);
    const delay = Math.max(1000, expiresAt - Date.now());
    this._refreshTimer = window.setTimeout(() => this._resolveImage(), delay);
  }

  private _setImage(src: string, failed: boolean): void {
    const els = this._els;
    if (!els) return;
    if (src === this._lastImageSrc && !failed) {
      return;
    }
    this._lastImageSrc = src;
    const previous = this._activeLayer === "a" ? els.imgA : els.imgB;
    if (!src) {
      previous.removeAttribute("src");
      previous.classList.add("hidden");
      this._updatePlaceholder(failed);
      return;
    }
    // Crossfade: load into the inactive layer, then swap when it arrives.
    const nextLayer = this._activeLayer === "a" ? "b" : "a";
    const next = nextLayer === "a" ? els.imgA : els.imgB;
    if (!previous.getAttribute("src")) {
      // Nothing visible yet: load straight into the active layer.
      previous.classList.remove("hidden");
      previous.src = src;
      this._updatePlaceholder(false, true);
      return;
    }
    next.classList.remove("hidden");
    next.dataset.pending = "1";
    next.src = src;
    this._updatePlaceholder(false, true);
  }

  private _swapLayers(loaded: HTMLImageElement): void {
    const els = this._els;
    if (!els) return;
    const layer = loaded === els.imgA ? "a" : "b";
    this._activeLayer = layer;
    els.imgA.classList.toggle("inactive", layer !== "a");
    els.imgB.classList.toggle("active", layer === "b");
    const other = layer === "a" ? els.imgB : els.imgA;
    window.setTimeout(() => {
      if (this._activeLayer === layer) {
        other.removeAttribute("src");
        other.classList.add("hidden");
      }
    }, 400);
  }

  private _updatePlaceholder(failed = false, loading = false): void {
    const els = this._els;
    if (!els) return;
    const hasImage = Boolean(this._lastImageSrc) && !failed;
    els.placeholder.classList.toggle("hidden", hasImage);
    if (!hasImage) {
      els.imgA.classList.add("hidden");
      els.imgB.classList.add("hidden");
    }
    const t = (key: string) => translate(this._lang, key);
    if (failed) {
      els.placeholderIcon.setAttribute("icon", "mdi:image-broken-variant");
      els.placeholderTitle.textContent = t("imageError");
      els.placeholderHelp.textContent = "";
    } else if (!loading) {
      els.placeholderIcon.setAttribute("icon", "mdi:image-plus-outline");
      els.placeholderTitle.textContent = t("noImage");
      els.placeholderHelp.textContent = t("noImageHelp");
    }
  }

  private _onImageError(img: HTMLImageElement): void {
    if (!img.getAttribute("src")) return;
    if (img.dataset.pending) {
      delete img.dataset.pending;
      img.removeAttribute("src");
      img.classList.add("hidden");
    }
    this._updatePlaceholder(true);
  }

  private _onImageLoad(img: HTMLImageElement): void {
    if (img.dataset.pending) {
      delete img.dataset.pending;
      this._swapLayers(img);
    }
    this._updatePlaceholder(false);
    this._updateDepth();
  }

  // ---------------------------------------------------------------- note

  private _noteSource(): NoteSource {
    const config = this._config;
    const page = this.page;
    const empty: NoteSource = { text: "", editable: false, error: "", max: null, domain: "", changed: "", entityId: "" };
    if (!config || !page) return empty;
    if (!page.note_entity) {
      return { ...empty, text: page.note };
    }
    const entity: HassEntity | undefined = this._hass?.states[page.note_entity];
    if (!entity) {
      return {
        ...empty,
        entityId: page.note_entity,
        error: this._hass ? translate(this._lang, "entityMissing", { entity: page.note_entity }) : "",
      };
    }
    const domain = page.note_entity.split(".")[0];
    const attr = page.note_attribute;
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
      changed: config.show_updated ? entity.last_changed ?? "" : "",
      entityId: page.note_entity,
    };
  }

  private _applyHass(): void {
    const els = this._els;
    const page = this.page;
    if (!els || !this._config || !page) return;

    if (page.image_entity) {
      const src = this._imageSourceFromEntity(page) ?? "";
      if (src !== this._lastImageSrc) {
        this._setImage(src, false);
      }
    }

    const source = this._noteSource();
    const last = this._lastNote;
    if (
      last &&
      last.text === source.text &&
      last.editable === source.editable &&
      last.error === source.error &&
      last.max === source.max &&
      last.changed === source.changed &&
      last.entityId === source.entityId
    ) {
      return;
    }
    this._lastNote = source;
    els.editButton.classList.toggle("hidden", !source.editable || this._editing);
    if (!this._editing) {
      this._renderNote(source);
    }
    this._renderMeta();
    requestAnimationFrame(() => this._updateScrollState());
  }

  private _renderMeta(): void {
    const els = this._els;
    if (!els) return;
    const changed = this._lastNote?.changed;
    if (!changed || this._editing) {
      els.noteMeta.textContent = "";
      els.noteMeta.classList.add("hidden");
      this._updateFooter();
      return;
    }
    const relative = formatRelativeTime(new Date(changed), this._lang);
    els.noteMeta.textContent = translate(this._lang, "updated", { time: relative });
    els.noteMeta.classList.remove("hidden");
    this._updateFooter();
  }

  private _startMetaTimer(): void {
    window.clearInterval(this._metaTimer);
    this._metaTimer = window.setInterval(() => this._renderMeta(), 30_000);
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
    this._stopTimers();
    this._setSide("note");
    els.scene.classList.add("editing");
    els.noteBody.style.display = "none";
    els.editButton.classList.add("hidden");
    els.noteEditor.classList.add("visible");
    els.noteFooter.classList.add("hidden");
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
    this._renderMeta();
    this._startTimers();
    els.stage.focus({ preventScroll: true });
  }

  private _cancelEdit(): void {
    if (!this._editing || this._saving) return;
    this._finishEdit();
  }

  private async _saveEdit(): Promise<void> {
    const els = this._els;
    if (!els || !this._hass || !this._editing || this._saving) return;
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
        entity_id: source.entityId,
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

  private _gestureAllowed(ev: PointerEvent): boolean {
    if (this._editing) return false;
    for (const node of ev.composedPath()) {
      if (node instanceof HTMLAnchorElement || node instanceof HTMLButtonElement) return false;
      if (node === this._els?.noteEditor) return false;
    }
    return true;
  }

  private async _handleGesture(kind: ActionKind): Promise<void> {
    const config = this._config;
    const page = this.page;
    if (!config || !page || this._editing) return;
    if (kind === "tap") {
      const root = this._root as ShadowRoot & { getSelection?: () => Selection | null };
      const selection = root.getSelection ? root.getSelection() : window.getSelection();
      if (selection && selection.toString().length > 0) return;
    }
    const action =
      kind === "hold" ? config.hold_action : kind === "double_tap" ? config.double_tap_action : config.tap_action;
    try {
      const shouldFlip = await runAction(
        this,
        this._hass,
        { note_entity: page.note_entity, image_entity: page.image_entity },
        action,
        translate(this._lang, "confirm"),
      );
      if (shouldFlip) this.flip();
    } catch (err) {
      console.warn("ImageNote: action failed", err);
    }
  }

  private readonly _onStageKeydown = (ev: KeyboardEvent): void => {
    if (this._editing) return;
    if (ev.target !== this._els?.stage) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      void this._handleGesture("tap");
    } else if (ev.key === "ArrowRight") {
      ev.preventDefault();
      this.goTo("next");
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      this.goTo("prev");
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

  private _startTimers(): void {
    this._stopTimers();
    const config = this._config;
    if (!this.isConnected || !config || this._tiles) return;
    if (config.auto_flip > 0) {
      this._autoFlipTimer = window.setInterval(() => {
        if (this._editing) return;
        this._setSide(this._side === "image" ? "note" : "image");
      }, config.auto_flip * 1000);
    }
    if (config.auto_advance > 0 && config.pages.length > 1) {
      this._autoAdvanceTimer = window.setInterval(() => {
        if (this._editing) return;
        this._showPage((this._index + 1) % config.pages.length);
      }, config.auto_advance * 1000);
    }
  }

  private _stopTimers(): void {
    window.clearInterval(this._autoFlipTimer);
    window.clearInterval(this._autoAdvanceTimer);
    this._autoFlipTimer = undefined;
    this._autoAdvanceTimer = undefined;
  }

  private _restartTimers(): void {
    if (this._autoFlipTimer !== undefined || this._autoAdvanceTimer !== undefined) {
      this._startTimers();
    }
  }

  private _observeResize(): void {
    if (!this._els || typeof ResizeObserver === "undefined") return;
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(() => {
      this._updateDepth();
      this._updateScrollState();
    });
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
