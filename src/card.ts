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
  ResolvedMedia,
  Side,
  Slide,
  Transition,
} from "./types";

/** Everything one face of the card can show: a picture layer and a note layer. */
interface FaceView {
  el: HTMLElement;
  img: HTMLImageElement;
  placeholder: HTMLElement;
  placeholderTitle: HTMLElement;
  placeholderHelp: HTMLElement;
  placeholderIcon: HTMLElement;
  titleOverlay: HTMLElement;
  noteLayer: HTMLElement;
  noteHeader: HTMLElement;
  noteTitle: HTMLElement;
  editButton: HTMLButtonElement;
  noteBody: HTMLElement;
  noteFooter: HTMLElement;
  noteMeta: HTMLElement;
  noteEditor: HTMLElement;
  textarea: HTMLTextAreaElement;
  errorText: HTMLElement;
  counter: HTMLElement;
  saveButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  /** What the picture layer currently shows. */
  src: string;
  failed: boolean;
  resolveToken: number;
}

interface Elements {
  card: HTMLElement;
  stage: HTMLElement;
  scene: HTMLElement;
  faces: [FaceView, FaceView];
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  dots: HTMLElement;
  badge: HTMLElement;
  badgeIcon: HTMLElement;
  badgeLabel: HTMLElement;
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

const FACE_TEMPLATE = `
  <div class="layer layer-image">
    <img alt="" draggable="false" />
    <div class="placeholder">
      <ha-icon icon="mdi:image-plus-outline"></ha-icon>
      <strong></strong>
      <small></small>
    </div>
    <div class="title-overlay"></div>
  </div>
  <div class="layer layer-note">
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
    <div class="note-footer"><div class="note-meta"></div></div>
  </div>`;

const TEMPLATE = `
<style>${CARD_STYLES}</style>
<ha-card>
  <div class="stage" tabindex="0" role="button">
    <div class="scene">
      <div class="face face-a current">${FACE_TEMPLATE}</div>
      <div class="face face-b hidden-face">${FACE_TEMPLATE}</div>
    </div>
    <div class="overlay">
      <button class="nav prev hidden" type="button"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
      <button class="nav next hidden" type="button"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
      <div class="dots hidden"></div>
      <div class="badge hidden"><ha-icon></ha-icon><span></span></div>
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
  private _index = 0;
  private _current: 0 | 1 = 0;
  private _angle = 0;
  private _faceAngle: [number, number] = [0, 0];
  private _animTimer?: number;
  private _editing = false;
  private _saving = false;
  private _els?: Elements;
  private _tiles?: ImageNoteCard[];
  private _resolved = new Map<string, ResolvedImage>();
  private _mediaPending = false;
  private _refreshTimer?: number;
  private _autoTimer?: number;
  private _metaTimer?: number;
  private _resizeObserver?: ResizeObserver;
  private _gestures?: GestureDetector;
  private readonly _motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly _hoverQuery = window.matchMedia("(hover: hover)");
  private _lastNote?: NoteSource;
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
    this._startTimers();
    window.clearInterval(this._metaTimer);
    this._metaTimer = window.setInterval(() => this._renderMeta(), 30_000);
  }

  disconnectedCallback(): void {
    this._motionQuery.removeEventListener("change", this._onMotionChange);
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._stopTimers();
    window.clearTimeout(this._refreshTimer);
    window.clearTimeout(this._animTimer);
    window.clearInterval(this._metaTimer);
    this._metaTimer = undefined;
  }

  setConfig(config: ImageNoteCardConfig): void {
    validateConfig(config);
    this._config = normalizeConfig(config);
    this._stopTimers();
    window.clearTimeout(this._animTimer);
    this._gestures?.destroy();
    this._gestures = undefined;
    this._els = undefined;
    this._tiles = undefined;
    this._editing = false;
    this._saving = false;
    this._lastNote = undefined;
    this._resolved.clear();
    if (this._config.layout === "grid" && this._config.entries.length > 1) {
      this._buildTiles(config);
      return;
    }
    this._build();
    this._applyConfig();
    this._index = this._startIndex();
    this._current = 0;
    this._resetPositions();
    this._renderSlide(this._els!.faces[0], this._slide);
    this._afterSlideChange(false);
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
    if (this._mediaPending && this._els) {
      this._applyImage(this._currentFace, this._slide);
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

  /** Next slide, or the first slide of the given kind. Also used by automations via the element. */
  flip(side?: Side): void {
    if (this._tiles) {
      for (const tile of this._tiles) tile.flip(side);
      return;
    }
    if (!this._config || this._editing) return;
    if (side) {
      const target = this._config.slides.findIndex((slide) => slide.kind === side);
      if (target >= 0 && target !== this._index) this._go(target, target > this._index ? 1 : -1, true);
      return;
    }
    this.goTo("next");
  }

  /** Go to a slide by index (wraps around), or one step with "next" / "prev". */
  goTo(target: number | "next" | "prev"): void {
    const config = this._config;
    if (!config || this._editing || this._tiles) return;
    const total = config.slides.length;
    if (total < 2) return;
    let index: number;
    let dir: 1 | -1 = 1;
    if (target === "next") {
      index = (this._index + 1) % total;
    } else if (target === "prev") {
      index = (this._index - 1 + total) % total;
      dir = -1;
    } else {
      index = ((Math.trunc(target) % total) + total) % total;
      dir = index >= this._index ? 1 : -1;
    }
    if (index === this._index) return;
    this._go(index, dir, true);
    this._restartTimers();
  }

  get slide(): Slide | undefined {
    return this._slide;
  }

  private get _slide(): Slide {
    const slides = this._config?.slides ?? [];
    return slides[Math.min(this._index, slides.length - 1)];
  }

  private get _currentFace(): FaceView {
    return this._els!.faces[this._current];
  }

  private _startIndex(): number {
    const config = this._config;
    if (!config) return 0;
    if (config.default_side === "note") {
      const first = config.slides.findIndex((slide) => slide.kind === "note");
      if (first >= 0) return first;
    }
    return 0;
  }

  // ---------------------------------------------------------------- tiles

  /** layout: grid — every config entry becomes its own tile, each a complete card of its own. */
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
    for (const key of ["slides", "images", "image", "image_entity", "note", "note_entity", "note_attribute", "title", "layout", "columns"] as const) {
      delete shared[key];
    }
    this._tiles = config.entries.map((entry) => {
      const tile = document.createElement(CARD_TYPE) as ImageNoteCard;
      tile.setConfig({
        ...shared,
        type: raw.type,
        layout: "stack",
        title: entry.title,
        image: entry.image,
        image_entity: entry.image_entity,
        note: entry.note,
        note_entity: entry.note_entity,
        note_attribute: entry.note_attribute,
      });
      if (this._hass) tile.hass = this._hass;
      grid.append(tile);
      return tile;
    });
  }

  // ---------------------------------------------------------------- building

  private _build(): void {
    this._root.innerHTML = TEMPLATE;
    const q = <T extends Element>(root: ParentNode, selector: string): T => {
      const el = root.querySelector<T>(selector);
      if (!el) throw new Error(`ImageNote: missing element ${selector}`);
      return el;
    };
    const face = (el: HTMLElement): FaceView => ({
      el,
      img: q(el, "img"),
      placeholder: q(el, ".placeholder"),
      placeholderTitle: q(el, ".placeholder strong"),
      placeholderHelp: q(el, ".placeholder small"),
      placeholderIcon: q(el, ".placeholder ha-icon"),
      titleOverlay: q(el, ".title-overlay"),
      noteLayer: q(el, ".layer-note"),
      noteHeader: q(el, ".note-header"),
      noteTitle: q(el, ".note-header .title"),
      editButton: q(el, ".edit"),
      noteBody: q(el, ".note-body"),
      noteFooter: q(el, ".note-footer"),
      noteMeta: q(el, ".note-meta"),
      noteEditor: q(el, ".note-editor"),
      textarea: q(el, "textarea"),
      errorText: q(el, ".error-text"),
      counter: q(el, ".counter"),
      saveButton: q(el, ".save"),
      cancelButton: q(el, ".cancel"),
      src: "",
      failed: false,
      resolveToken: 0,
    });
    this._els = {
      card: q(this._root, "ha-card"),
      stage: q(this._root, ".stage"),
      scene: q(this._root, ".scene"),
      faces: [face(q(this._root, ".face-a")), face(q(this._root, ".face-b"))],
      prev: q(this._root, ".nav.prev"),
      next: q(this._root, ".nav.next"),
      dots: q(this._root, ".dots"),
      badge: q(this._root, ".badge"),
      badgeIcon: q(this._root, ".badge ha-icon"),
      badgeLabel: q(this._root, ".badge span"),
    };
    const els = this._els;

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
    els.prev.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.goTo("prev");
    });
    els.next.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.goTo("next");
    });

    for (const view of els.faces) {
      view.img.addEventListener("error", () => this._onImageError(view));
      view.img.addEventListener("load", () => this._onImageLoad(view));
      view.editButton.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (view === this._currentFace) this._startEdit();
      });
      view.noteEditor.addEventListener("click", (ev) => ev.stopPropagation());
      view.noteEditor.addEventListener("keydown", (ev) => ev.stopPropagation());
      view.textarea.addEventListener("input", () => this._updateCounter());
      view.textarea.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          this._cancelEdit();
        } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          void this._saveEdit();
        }
      });
      view.cancelButton.addEventListener("click", () => this._cancelEdit());
      view.saveButton.addEventListener("click", () => void this._saveEdit());
      view.noteBody.addEventListener("scroll", () => this._updateScrollState(view), { passive: true });
    }

    this._buildDots();
    this._applyStrings();
  }

  private _buildDots(): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const total = config.slides.length;
    const show = total > 2 && config.show_navigation;
    els.dots.replaceChildren();
    els.dots.classList.toggle("hidden", !show);
    els.prev.classList.toggle("hidden", !show);
    els.next.classList.toggle("hidden", !show);
    els.stage.classList.toggle("with-dots", show);
    if (!show) return;
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.goTo(i);
      });
      els.dots.append(dot);
    }
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
    els.stage.classList.toggle("hover-flip", config.hover_flip);
    els.badge.classList.toggle("hidden", !config.show_hint || config.slides.length < 2);
    this._applyMode();
  }

  private _mode(): Transition {
    const config = this._config;
    if (!config) return "flip";
    return this._motionQuery.matches && config.transition !== "none" ? "fade" : config.transition;
  }

  private _applyMode(): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const reduced = this._motionQuery.matches;
    const duration = reduced ? Math.min(config.duration, 200) : config.duration;
    this.style.setProperty("--imagenote-duration", `${duration}ms`);
    els.scene.classList.remove("mode-flip", "mode-fade", "mode-slide", "mode-cube", "mode-none");
    els.scene.classList.add(`mode-${this._mode()}`);
    this._resetPositions();
  }

  private _applyStrings(): void {
    const els = this._els;
    if (!els) return;
    const t = (key: string) => translate(this._lang, key);
    for (const view of els.faces) {
      view.editButton.title = t("editNote");
      view.editButton.setAttribute("aria-label", t("editNote"));
      view.cancelButton.textContent = t("cancel");
      view.saveButton.textContent = this._saving ? t("saving") : t("save");
    }
    els.prev.title = t("previousPicture");
    els.prev.setAttribute("aria-label", t("previousPicture"));
    els.next.title = t("nextPicture");
    els.next.setAttribute("aria-label", t("nextPicture"));
    if (this._config) {
      this._lastNote = undefined;
      this._renderSlide(this._currentFace, this._slide);
      this._afterSlideChange(false);
    }
  }

  // ---------------------------------------------------------------- slide engine

  private _rot(): "rotateX" | "rotateY" {
    return this._config?.direction === "vertical" ? "rotateX" : "rotateY";
  }

  private _depth(): number {
    const els = this._els;
    if (!els) return 150;
    const rect = els.stage.getBoundingClientRect();
    const size = this._config?.direction === "vertical" ? rect.height : rect.width;
    return size > 0 ? size / 2 : 150;
  }

  /** Where a face sits for a given angle, per transition mode. */
  private _faceTransform(angle: number): string {
    const mode = this._mode();
    const sign = this._config?.direction === "vertical" ? -1 : 1;
    if (mode === "flip") return `${this._rot()}(${sign * angle}deg)`;
    if (mode === "cube") return `${this._rot()}(${sign * angle}deg) translateZ(${this._depth()}px)`;
    return "";
  }

  private _sceneTransform(angle: number): string {
    const mode = this._mode();
    const sign = this._config?.direction === "vertical" ? -1 : 1;
    if (mode === "flip") return `${this._rot()}(${-sign * angle}deg)`;
    if (mode === "cube") return `translateZ(${-this._depth()}px) ${this._rot()}(${-sign * angle}deg)`;
    return "";
  }

  /** Puts the current face in front without animation and parks the other one. */
  private _resetPositions(): void {
    const els = this._els;
    if (!els) return;
    window.clearTimeout(this._animTimer);
    this._angle = 0;
    this._faceAngle = [0, 0];
    els.scene.classList.add("no-transition");
    els.scene.style.transform = this._sceneTransform(0);
    els.faces.forEach((view, i) => {
      view.el.style.transform = this._faceTransform(0);
      view.el.style.opacity = "";
      const isCurrent = i === this._current;
      view.el.classList.toggle("current", isCurrent);
      view.el.classList.toggle("hidden-face", !isCurrent);
    });
    void els.scene.offsetWidth; // flush so the next change animates
    els.scene.classList.remove("no-transition");
  }

  private _go(index: number, dir: 1 | -1, animate: boolean): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config || this._editing) return;
    const slide = config.slides[index];
    if (!slide) return;
    const fromIndex = this._current;
    const toIndex: 0 | 1 = fromIndex === 0 ? 1 : 0;
    const from = els.faces[fromIndex];
    const to = els.faces[toIndex];
    const mode = animate ? this._mode() : "none";
    const duration = Number.parseFloat(getComputedStyle(this).getPropertyValue("--imagenote-duration")) || 0;

    window.clearTimeout(this._animTimer);
    this._index = index;
    this._lastNote = undefined;
    this._renderSlide(to, slide);
    to.el.classList.remove("hidden-face");
    to.el.classList.add("current");
    from.el.classList.remove("current");

    const axis = config.direction === "vertical" ? "translateY" : "translateX";
    switch (mode) {
      case "flip":
      case "cube": {
        this._angle += dir * (mode === "flip" ? 180 : 90);
        this._faceAngle[toIndex] = this._angle;
        to.el.style.transform = this._faceTransform(this._angle);
        els.scene.style.transform = this._sceneTransform(this._angle);
        break;
      }
      case "slide": {
        els.scene.classList.add("no-transition");
        to.el.style.transform = `${axis}(${dir * 100}%)`;
        from.el.style.transform = `${axis}(0)`;
        void els.scene.offsetWidth;
        els.scene.classList.remove("no-transition");
        to.el.style.transform = `${axis}(0)`;
        from.el.style.transform = `${axis}(${-dir * 100}%)`;
        break;
      }
      case "fade": {
        els.scene.classList.add("no-transition");
        to.el.style.opacity = "0";
        from.el.style.opacity = "1";
        void els.scene.offsetWidth;
        els.scene.classList.remove("no-transition");
        to.el.style.opacity = "1";
        from.el.style.opacity = "0";
        break;
      }
      default: {
        this._current = toIndex;
        this._resetPositions();
        break;
      }
    }
    this._current = toIndex;
    this._lastNote = slide.kind === "note" ? this._noteSource(slide) : undefined;
    if (mode !== "none") {
      this._animTimer = window.setTimeout(() => {
        from.el.classList.add("hidden-face");
        this._updateScrollState(to);
      }, duration);
    }
    this._afterSlideChange(true);
  }

  /** Dots, badge, aria and events after the visible slide changed. */
  private _afterSlideChange(emit: boolean): void {
    const els = this._els;
    const config = this._config;
    if (!els || !config) return;
    const slide = this._slide;
    const total = config.slides.length;
    els.stage.classList.toggle("kind-note", slide.kind === "note");
    Array.from(els.dots.children).forEach((dot, i) => dot.classList.toggle("active", i === this._index));

    const next = config.slides[(this._index + 1) % total];
    const t = (key: string, vars?: Record<string, string | number>) => translate(this._lang, key, vars);
    if (next && total > 1) {
      els.badgeIcon.setAttribute("icon", next.kind === "note" ? "mdi:note-text-outline" : "mdi:image-outline");
      els.badgeLabel.textContent = t(next.kind === "note" ? "note" : "photo");
    }
    const parts: string[] = [];
    const title = slide.title || config.title;
    if (title) parts.push(title);
    if (total > 1) parts.push(t("slide", { index: this._index + 1, total }));
    if (next && total > 1) parts.push(t(next.kind === "note" ? "showNote" : "showPhoto"));
    els.stage.setAttribute("aria-label", parts.join(" – "));
    els.stage.setAttribute("aria-pressed", String(slide.kind === "note"));

    this._updateScrollState(this._currentFace);
    if (emit) {
      const detail = { index: this._index, kind: slide.kind, side: slide.kind };
      this.dispatchEvent(new CustomEvent("imagenote-slide", { detail, bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent("imagenote-flip", { detail, bubbles: true, composed: true }));
    }
  }

  private _onSwipe(direction: SwipeDirection): void {
    if (!this._config || this._config.slides.length < 2 || this._editing) return;
    this.goTo(direction === "left" ? "next" : "prev");
  }

  // ---------------------------------------------------------------- rendering a slide into a face

  private _renderSlide(view: FaceView, slide: Slide): void {
    const config = this._config;
    if (!config) return;
    view.el.classList.toggle("kind-image", slide.kind === "image");
    view.el.classList.toggle("kind-note", slide.kind === "note");
    const title = slide.title || config.title;
    if (slide.kind === "image") {
      view.titleOverlay.textContent = title;
      view.titleOverlay.classList.toggle("hidden", !(config.show_title && title));
      this._applyImage(view, slide);
    } else {
      view.noteTitle.textContent = title || translate(this._lang, "note");
      view.noteHeader.classList.toggle("no-title", !title);
      const source = this._noteSource(slide);
      if (view === this._currentFace) this._lastNote = source;
      view.editButton.classList.toggle("hidden", !source.editable);
      this._renderNote(view, source);
      this._renderMetaFor(view, source);
    }
  }

  // ---------------------------------------------------------------- picture

  private _imageSourceFromEntity(slide: Slide): string | undefined {
    if (!slide.image_entity || !this._hass) return undefined;
    const entity = this._hass.states[slide.image_entity];
    if (!entity) return undefined;
    const picture = entity.attributes.entity_picture;
    if (typeof picture !== "string" || !picture) return undefined;
    const domain = slide.image_entity.split(".")[0];
    if (domain === "image" || domain === "camera") {
      const join = picture.includes("?") ? "&" : "?";
      return `${picture}${join}state=${encodeURIComponent(entity.state)}`;
    }
    return picture;
  }

  private _applyImage(view: FaceView, slide: Slide): void {
    const token = ++view.resolveToken;
    this._mediaPending = false;
    if (slide.image_entity) {
      this._setImage(view, this._imageSourceFromEntity(slide) ?? "", false);
      return;
    }
    const image = slide.image;
    if (!image) {
      this._setImage(view, "", false);
      return;
    }
    const mediaId = typeof image === "string" ? (isMediaSourceId(image) ? image : undefined) : image.media_content_id;
    if (!mediaId) {
      this._setImage(view, image as string, false);
      return;
    }
    const cached = this._resolved.get(mediaId);
    if (cached && !cached.failed && cached.expiresAt > Date.now()) {
      this._setImage(view, cached.url, false);
      this._scheduleRefresh(cached.expiresAt);
      return;
    }
    if (!this._hass) {
      this._mediaPending = true;
      this._setImage(view, "", false);
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
        this._resolved.set(mediaId, { url: result.url, failed: false, expiresAt });
        if (token !== view.resolveToken) return;
        this._setImage(view, result.url, false);
        this._scheduleRefresh(expiresAt);
      })
      .catch(() => {
        this._resolved.set(mediaId, { url: "", failed: true, expiresAt: 0 });
        if (token !== view.resolveToken) return;
        this._setImage(view, "", true);
      });
  }

  private _scheduleRefresh(expiresAt: number): void {
    window.clearTimeout(this._refreshTimer);
    const delay = Math.max(1000, expiresAt - Date.now());
    this._refreshTimer = window.setTimeout(() => {
      if (this._els && this._slide.kind === "image") this._applyImage(this._currentFace, this._slide);
    }, delay);
  }

  private _setImage(view: FaceView, src: string, failed: boolean): void {
    if (src === view.src && failed === view.failed) {
      this._updatePlaceholder(view);
      return;
    }
    view.src = src;
    view.failed = failed;
    if (src) {
      view.img.src = src;
    } else {
      view.img.removeAttribute("src");
    }
    this._updatePlaceholder(view);
  }

  private _updatePlaceholder(view: FaceView): void {
    const hasImage = Boolean(view.src) && !view.failed;
    view.placeholder.classList.toggle("hidden", hasImage);
    view.img.classList.toggle("hidden", !hasImage);
    const t = (key: string) => translate(this._lang, key);
    if (view.failed) {
      view.placeholderIcon.setAttribute("icon", "mdi:image-broken-variant");
      view.placeholderTitle.textContent = t("imageError");
      view.placeholderHelp.textContent = "";
    } else {
      view.placeholderIcon.setAttribute("icon", "mdi:image-plus-outline");
      view.placeholderTitle.textContent = t("noImage");
      view.placeholderHelp.textContent = t("noImageHelp");
    }
  }

  private _onImageError(view: FaceView): void {
    if (!view.img.getAttribute("src")) return;
    view.failed = true;
    this._updatePlaceholder(view);
  }

  private _onImageLoad(view: FaceView): void {
    view.failed = false;
    this._updatePlaceholder(view);
    this._updateDepth();
  }

  // ---------------------------------------------------------------- note

  private _noteSource(slide: Slide): NoteSource {
    const config = this._config;
    const empty: NoteSource = { text: "", editable: false, error: "", max: null, domain: "", changed: "", entityId: "" };
    if (!config) return empty;
    if (!slide.note_entity) {
      return { ...empty, text: slide.note };
    }
    const entity: HassEntity | undefined = this._hass?.states[slide.note_entity];
    if (!entity) {
      return {
        ...empty,
        entityId: slide.note_entity,
        error: this._hass ? translate(this._lang, "entityMissing", { entity: slide.note_entity }) : "",
      };
    }
    const domain = slide.note_entity.split(".")[0];
    const attr = slide.note_attribute;
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
      entityId: slide.note_entity,
    };
  }

  /** Reacts to state changes for the slide currently shown. */
  private _applyHass(): void {
    const els = this._els;
    if (!els || !this._config) return;
    const slide = this._slide;
    const view = this._currentFace;
    if (slide.kind === "image") {
      if (slide.image_entity) {
        const src = this._imageSourceFromEntity(slide) ?? "";
        if (src !== view.src) this._setImage(view, src, false);
      }
      return;
    }
    const source = this._noteSource(slide);
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
    view.editButton.classList.toggle("hidden", !source.editable || this._editing);
    if (!this._editing) {
      this._renderNote(view, source);
    }
    this._renderMetaFor(view, source);
    requestAnimationFrame(() => this._updateScrollState(view));
  }

  private _renderMeta(): void {
    if (!this._els || !this._lastNote || this._slide.kind !== "note") return;
    this._renderMetaFor(this._currentFace, this._lastNote);
  }

  private _renderMetaFor(view: FaceView, source: NoteSource): void {
    if (!source.changed || this._editing) {
      view.noteMeta.textContent = "";
      return;
    }
    const relative = formatRelativeTime(new Date(source.changed), this._lang);
    view.noteMeta.textContent = translate(this._lang, "updated", { time: relative });
  }

  private _updateScrollState(view: FaceView): void {
    const body = view.noteBody;
    const scrollable = body.scrollHeight > body.clientHeight + 1;
    const atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
    view.noteLayer.classList.toggle("scrollable", scrollable);
    view.noteLayer.classList.toggle("at-end", atEnd);
  }

  private _renderNote(view: FaceView, source: NoteSource): void {
    const body = view.noteBody;
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
      const md = document.createElement("ha-markdown") as HTMLElement & { content?: string; breaks?: boolean };
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
    window
      .loadCardHelpers?.()
      .then((helpers) => {
        helpers.createCardElement({ type: "markdown", content: " " });
      })
      .catch(() => undefined);
    void customElements.whenDefined("ha-markdown").then(() => {
      this._markdownReady = true;
      if (this._els && this._lastNote && !this._editing && this._slide.kind === "note") {
        this._renderNote(this._currentFace, this._lastNote);
      }
    });
  }

  // ---------------------------------------------------------------- editing

  private _startEdit(): void {
    const els = this._els;
    if (!els || this._slide.kind !== "note" || !this._hass) return;
    const view = this._currentFace;
    const source = this._lastNote ?? this._noteSource(this._slide);
    if (!source.editable) return;
    this._editing = true;
    this._stopTimers();
    els.scene.classList.add("editing");
    els.stage.classList.add("editing");
    view.noteBody.style.display = "none";
    view.noteFooter.style.display = "none";
    view.editButton.classList.add("hidden");
    view.noteEditor.classList.add("visible");
    view.errorText.textContent = "";
    view.textarea.value = source.text;
    if (source.max) {
      view.textarea.maxLength = source.max;
    } else {
      view.textarea.removeAttribute("maxlength");
    }
    this._updateCounter();
    view.textarea.focus();
    view.textarea.setSelectionRange(view.textarea.value.length, view.textarea.value.length);
  }

  private _finishEdit(): void {
    const els = this._els;
    if (!els) return;
    const view = this._currentFace;
    this._editing = false;
    this._saving = false;
    els.scene.classList.remove("editing");
    els.stage.classList.remove("editing");
    view.noteBody.style.display = "";
    view.noteFooter.style.display = "";
    view.noteEditor.classList.remove("visible");
    view.saveButton.disabled = false;
    view.cancelButton.disabled = false;
    view.saveButton.textContent = translate(this._lang, "save");
    const source = this._noteSource(this._slide);
    this._lastNote = source;
    view.editButton.classList.toggle("hidden", !source.editable);
    this._renderNote(view, source);
    this._renderMetaFor(view, source);
    this._updateScrollState(view);
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
    const view = this._currentFace;
    const source = this._lastNote ?? this._noteSource(this._slide);
    const value = view.textarea.value;
    if (value === source.text) {
      this._finishEdit();
      return;
    }
    this._saving = true;
    view.saveButton.disabled = true;
    view.cancelButton.disabled = true;
    view.saveButton.textContent = translate(this._lang, "saving");
    view.errorText.textContent = "";
    try {
      await this._hass.callService(source.domain, "set_value", { entity_id: source.entityId, value });
      this._lastNote = { ...source, text: value };
      this._finishEdit();
      this._renderNote(view, this._lastNote);
    } catch (err) {
      this._saving = false;
      view.saveButton.disabled = false;
      view.cancelButton.disabled = false;
      view.saveButton.textContent = translate(this._lang, "save");
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
      view.errorText.textContent = `${translate(this._lang, "saveFailed")}${message ? `: ${message}` : ""}`;
    }
  }

  private _updateCounter(): void {
    if (!this._els) return;
    const view = this._currentFace;
    const max = (this._lastNote ?? this._noteSource(this._slide)).max;
    if (!max) {
      view.counter.textContent = "";
      return;
    }
    const left = max - view.textarea.value.length;
    view.counter.textContent = translate(this._lang, "charsLeft", { count: left });
    view.counter.classList.toggle("over", left < 0);
  }

  // ---------------------------------------------------------------- interaction

  private _gestureAllowed(ev: PointerEvent): boolean {
    if (this._editing) return false;
    for (const node of ev.composedPath()) {
      if (node instanceof HTMLAnchorElement || node instanceof HTMLButtonElement) return false;
      if (node instanceof HTMLElement && node.classList.contains("note-editor")) return false;
    }
    return true;
  }

  private async _handleGesture(kind: ActionKind): Promise<void> {
    const config = this._config;
    if (!config || this._editing) return;
    if (kind === "tap") {
      const root = this._root as ShadowRoot & { getSelection?: () => Selection | null };
      const selection = root.getSelection ? root.getSelection() : window.getSelection();
      if (selection && selection.toString().length > 0) return;
    }
    const slide = this._slide;
    // Default entities come from the config entry, so a picture slide still knows its note entity.
    const entry = config.entries[slide.entry] ?? slide;
    const action =
      kind === "hold" ? config.hold_action : kind === "double_tap" ? config.double_tap_action : config.tap_action;
    try {
      const shouldFlip = await runAction(
        this,
        this._hass,
        { note_entity: entry.note_entity, image_entity: entry.image_entity },
        action,
        translate(this._lang, "confirm"),
      );
      if (shouldFlip) this.goTo("next");
    } catch (err) {
      console.warn("ImageNote: action failed", err);
    }
  }

  private readonly _onStageKeydown = (ev: KeyboardEvent): void => {
    if (this._editing || ev.target !== this._els?.stage) return;
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
    this.goTo("next");
  };

  private readonly _onMouseLeave = (): void => {
    if (!this._config?.hover_flip || !this._hoverQuery.matches || this._editing) return;
    const start = this._startIndex();
    if (start !== this._index) this._go(start, -1, true);
  };

  private readonly _onMotionChange = (): void => {
    this._applyMode();
  };

  // ---------------------------------------------------------------- timers & layout

  private _startTimers(): void {
    this._stopTimers();
    const config = this._config;
    if (!this.isConnected || !config || this._tiles || !this._els) return;
    const seconds = config.auto_flip || config.auto_advance;
    if (seconds > 0 && config.slides.length > 1) {
      this._autoTimer = window.setInterval(() => {
        if (!this._editing) this.goTo("next");
      }, seconds * 1000);
    }
  }

  private _stopTimers(): void {
    window.clearInterval(this._autoTimer);
    this._autoTimer = undefined;
  }

  private _restartTimers(): void {
    if (this._autoTimer !== undefined) this._startTimers();
  }

  private _observeResize(): void {
    if (!this._els || typeof ResizeObserver === "undefined") return;
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(() => {
      this._updateDepth();
      if (this._els) this._updateScrollState(this._currentFace);
    });
    this._resizeObserver.observe(this._els.stage);
  }

  /** The cube keeps its faces at half the stage size; re-place them when the card resizes. */
  private _updateDepth(): void {
    const els = this._els;
    if (!els || this._mode() !== "cube") return;
    els.scene.classList.add("no-transition");
    els.faces.forEach((view, i) => {
      view.el.style.transform = this._faceTransform(this._faceAngle[i]);
    });
    els.scene.style.transform = this._sceneTransform(this._angle);
    void els.scene.offsetWidth;
    els.scene.classList.remove("no-transition");
  }
}
