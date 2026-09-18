export const CARD_STYLES = `
:host {
  display: block;
  --imagenote-duration: 700ms;
  --imagenote-easing: cubic-bezier(0.4, 0.05, 0.2, 1);
  --imagenote-radius: var(--ha-card-border-radius, 12px);
  --imagenote-note-background: var(--ha-card-background, var(--card-background-color, #fff));
  --imagenote-badge-background: rgba(0, 0, 0, 0.55);
  --imagenote-badge-color: #fff;
  --imagenote-placeholder-background: var(--secondary-background-color, #f2f2f2);
}

ha-card {
  position: relative;
  overflow: hidden;
  height: 100%;
  box-sizing: border-box;
  border-radius: var(--imagenote-radius);
}

.stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 96px;
  perspective: 1400px;
  overflow: hidden;
  border-radius: var(--imagenote-radius);
  outline: none;
}
.stage.ratio {
  aspect-ratio: var(--imagenote-aspect, 16 / 9);
}
.stage.natural {
  height: auto;
}
.stage:focus-visible::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 2px var(--primary-color);
  pointer-events: none;
  z-index: 5;
}

.scene {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.stage.natural .scene {
  position: relative;
  inset: auto;
}
.scene.editing {
  cursor: default;
}

.face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--imagenote-radius);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: var(--imagenote-note-background);
  transform: translateZ(0);
}
.stage.natural .face.front {
  position: relative;
  inset: auto;
}

/* ---------- transitions ---------- */
.scene.flip,
.scene.cube {
  transition: transform var(--imagenote-duration) var(--imagenote-easing);
}
.scene.flip.horizontal .back { transform: rotateY(180deg); }
.scene.flip.horizontal.flipped { transform: rotateY(180deg); }
.scene.flip.vertical .back { transform: rotateX(-180deg); }
.scene.flip.vertical.flipped { transform: rotateX(180deg); }

.scene.fade .face {
  transition:
    opacity var(--imagenote-duration) ease,
    visibility 0s linear var(--imagenote-duration);
}
.scene.fade .back { opacity: 0; visibility: hidden; }
.scene.fade.flipped .back { opacity: 1; visibility: visible; transition-delay: 0s, 0s; }
.scene.fade.flipped .front { opacity: 0; visibility: hidden; }

.scene.slide .face {
  transition: transform var(--imagenote-duration) var(--imagenote-easing);
}
.scene.slide.horizontal .back { transform: translateX(100%); }
.scene.slide.horizontal.flipped .front { transform: translateX(-100%); }
.scene.slide.horizontal.flipped .back { transform: translateX(0); }
.scene.slide.vertical .back { transform: translateY(100%); }
.scene.slide.vertical.flipped .front { transform: translateY(-100%); }
.scene.slide.vertical.flipped .back { transform: translateY(0); }

.scene.cube { transform: translateZ(calc(-1 * var(--imagenote-depth, 150px))); }
.scene.cube .front { transform: translateZ(var(--imagenote-depth, 150px)); }
.scene.cube.horizontal .back { transform: rotateY(90deg) translateZ(var(--imagenote-depth, 150px)); }
.scene.cube.horizontal.flipped { transform: translateZ(calc(-1 * var(--imagenote-depth, 150px))) rotateY(-90deg); }
.scene.cube.vertical .back { transform: rotateX(-90deg) translateZ(var(--imagenote-depth, 150px)); }
.scene.cube.vertical.flipped { transform: translateZ(calc(-1 * var(--imagenote-depth, 150px))) rotateX(90deg); }

.scene.none .back { visibility: hidden; }
.scene.none.flipped .back { visibility: visible; }
.scene.none.flipped .front { visibility: hidden; }

/* ---------- picture side ---------- */
.front img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--imagenote-fit, cover);
  background: var(--imagenote-placeholder-background);
  transition: opacity 350ms ease;
}
.front img.layer-b {
  position: absolute;
  inset: 0;
  opacity: 0;
}
.front img.layer-b.active {
  opacity: 1;
}
.front img.layer-a.inactive {
  opacity: 0;
}
.stage.natural .front img.layer-a {
  height: auto;
}
.front img.hidden {
  display: none;
}

.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: pointer;
  opacity: 0;
  transition: opacity 200ms ease, background-color 150ms ease;
  z-index: 3;
  padding: 0;
}
.nav.prev { left: 8px; }
.nav.next { right: 8px; }
.nav:hover,
.nav:focus-visible {
  background: rgba(0, 0, 0, 0.55);
  outline: none;
}
.scene:hover .nav,
.stage:focus-within .nav {
  opacity: 1;
}
@media (hover: none) {
  .nav { opacity: 0.8; }
}
.nav.hidden {
  display: none !important;
}
.back .nav {
  color: var(--primary-text-color);
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
}

.dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 10px;
  display: flex;
  justify-content: center;
  gap: 6px;
  z-index: 3;
  pointer-events: none;
}
.dots.hidden {
  display: none;
}
.dots button {
  appearance: none;
  border: none;
  padding: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 150ms ease, background-color 150ms ease;
}
.dots button.active {
  background: #fff;
  transform: scale(1.3);
}
.back .dots button {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.25);
  box-shadow: none;
}
.back .dots button.active {
  background: var(--primary-color);
}
.title-overlay.with-dots {
  padding-bottom: 26px;
}
.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  color: var(--secondary-text-color);
  background: var(--imagenote-placeholder-background);
  border: 2px dashed var(--divider-color, rgba(0, 0, 0, 0.12));
  border-radius: var(--imagenote-radius);
  box-sizing: border-box;
}
.stage.natural .placeholder {
  position: relative;
  min-height: 160px;
}
.placeholder ha-icon {
  --mdc-icon-size: 40px;
  opacity: 0.6;
}
.placeholder strong {
  color: var(--primary-text-color);
  font-weight: 500;
}
.placeholder small {
  font-size: 0.85em;
  max-width: 28em;
}
.placeholder.hidden {
  display: none;
}

.title-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 36px 16px 14px;
  color: #fff;
  font-size: 1.15em;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0));
  pointer-events: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.title-overlay.hidden {
  display: none;
}

/* ---------- note side ---------- */
.back {
  display: flex;
  flex-direction: column;
  color: var(--primary-text-color);
}
.note-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 8px 16px;
  min-height: 24px;
}
.note-header ha-icon {
  color: var(--primary-color);
  flex: none;
}
.note-header .title {
  flex: 1;
  font-size: 1.05em;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-header.no-title .title {
  color: var(--secondary-text-color);
  font-weight: 400;
}
.note-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 16px 16px;
  line-height: 1.5;
  font-size: 0.98em;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.note-body ha-markdown {
  display: block;
}
.note-body .note-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.note-body .note-empty {
  color: var(--secondary-text-color);
}
.note-body .note-empty small {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
}
.note-body p:first-child,
.note-body ha-markdown p:first-child {
  margin-top: 0;
}

.note-meta {
  padding: 0 16px 10px;
  font-size: 0.75em;
  color: var(--secondary-text-color);
  max-width: calc(100% - 110px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-meta.hidden,
.note-meta:empty {
  display: none;
}

.icon-button {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--secondary-text-color);
  width: 36px;
  height: 36px;
  margin: -6px -6px -6px 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
  transition: background-color 150ms ease, color 150ms ease;
}
.icon-button:hover,
.icon-button:focus-visible {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
  color: var(--primary-color);
  outline: none;
}
.icon-button.hidden {
  display: none;
}

.note-editor {
  display: none;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 8px;
  padding: 0 16px 12px;
}
.note-editor.visible {
  display: flex;
}
.note-editor textarea {
  flex: 1;
  min-height: 72px;
  width: 100%;
  box-sizing: border-box;
  resize: none;
  padding: 10px 12px;
  font: inherit;
  line-height: 1.45;
  color: var(--primary-text-color);
  background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  border-radius: 8px;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.note-editor textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--rgb-primary-color, 3, 169, 244), 0.2);
}
.note-editor .actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.note-editor .counter {
  flex: 1;
  font-size: 0.8em;
  color: var(--secondary-text-color);
}
.note-editor .counter.over {
  color: var(--error-color, #db4437);
}
.btn {
  appearance: none;
  font: inherit;
  font-size: 0.9em;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
  transition: background-color 150ms ease, opacity 150ms ease;
}
.btn:hover:not(:disabled) {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.06);
}
.btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-primary-color, #fff);
}
.btn.primary:hover:not(:disabled) {
  background: var(--primary-color);
  filter: brightness(1.08);
}
.btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.error-text {
  color: var(--error-color, #db4437);
  font-size: 0.85em;
}
.error-text:empty {
  display: none;
}

/* ---------- flip hint badge ---------- */
.badge {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 8px;
  border-radius: 999px;
  font-size: 0.78em;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--imagenote-badge-color);
  background: var(--imagenote-badge-background);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0.85;
  transition: opacity 200ms ease, transform 200ms ease;
  pointer-events: none;
  z-index: 2;
}
.badge ha-icon {
  --mdc-icon-size: 16px;
}
.back .badge {
  color: var(--primary-text-color);
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
}
.scene:hover .badge {
  opacity: 1;
  transform: translateY(-2px);
}
.badge.hidden,
.scene.editing .badge {
  display: none;
}

@media (hover: hover) {
  .scene.hover-flip:not(.editing):hover .badge {
    opacity: 0;
  }
}
`;

export const EDITOR_STYLES = `
:host {
  display: block;
}
.version {
  margin-top: 16px;
  font-size: 0.75em;
  color: var(--secondary-text-color);
  text-align: right;
}
`;
