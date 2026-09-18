export const CARD_STYLES = `
:host {
  display: block;
  height: 100%;
  --pinboard-duration: 700ms;
  --pinboard-easing: cubic-bezier(0.4, 0.05, 0.2, 1);
  --pinboard-radius: var(--ha-card-border-radius, 12px);
  --pinboard-note-background: var(--ha-card-background, var(--card-background-color, #fff));
  --pinboard-badge-background: rgba(0, 0, 0, 0.55);
  --pinboard-badge-color: #fff;
  --pinboard-placeholder-background: var(--secondary-background-color, #f2f2f2);
}

ha-card {
  position: relative;
  overflow: hidden;
  height: 100%;
  box-sizing: border-box;
  border-radius: var(--pinboard-radius);
}

.hidden {
  display: none !important;
}

/* ---------- stage & scene ---------- */
.stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 96px;
  perspective: 1400px;
  overflow: hidden;
  border-radius: var(--pinboard-radius);
  outline: none;
}
.stage.ratio {
  aspect-ratio: var(--pinboard-aspect, 16 / 9);
  container-type: size;
}
.stage.natural {
  height: auto;
  container-type: inline-size;
}
.stage:focus-visible::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 2px var(--primary-color);
  pointer-events: none;
  z-index: 6;
}

.scene {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--pinboard-duration) var(--pinboard-easing);
}
.stage.natural .scene {
  position: relative;
  inset: auto;
}
.scene.editing {
  cursor: default;
}
.scene.no-transition,
.scene.no-transition .face {
  transition: none !important;
}

.face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--pinboard-radius);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: var(--pinboard-note-background);
}
.face.hidden-face {
  visibility: hidden;
}
.face.tinted .layer-note {
  color: var(--pinboard-note-text, var(--primary-text-color));
}
.face.tinted .note-header ha-icon,
.face.tinted .icon-button,
.face.tinted .note-meta,
.face.tinted .note-header.no-title .title {
  color: inherit;
  opacity: 0.75;
}
.face.sticky.kind-note {
  --pinboard-note-background: var(--pinboard-sticky-color, #fff3a8);
  --pinboard-note-text: #2b2b2b;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}
.face.sticky.kind-note .layer-note {
  color: var(--pinboard-note-text);
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(0, 0, 0, 0) 60%);
}
.face.sticky.kind-note .layer-note::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 26px;
  height: 26px;
  background: linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.12) 50%, rgba(0, 0, 0, 0.05));
  border-top-left-radius: 6px;
  pointer-events: none;
}
.face.sticky.kind-note .note-header ha-icon,
.face.sticky.kind-note .icon-button {
  color: inherit;
  opacity: 0.7;
}
.face.expired .layer-note,
.face.expired .layer-image img {
  filter: grayscale(0.6);
  opacity: 0.55;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  background: var(--error-color, #db4437);
  flex: none;
}
.image-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
}
.stage.natural .face.current {
  position: relative;
  inset: auto;
}
.scene.mode-fade .face {
  transition: opacity var(--pinboard-duration) ease;
}
.scene.mode-slide .face {
  transition: transform var(--pinboard-duration) var(--pinboard-easing);
}

/* ---------- layers ---------- */
.layer {
  position: absolute;
  inset: 0;
  display: none;
}
.face.kind-image .layer-image {
  display: block;
}
.face.kind-note .layer-note {
  display: flex;
  flex-direction: column;
  color: var(--primary-text-color);
}
.face.kind-audio .layer-audio {
  display: flex;
  flex-direction: column;
  color: var(--primary-text-color);
}

/* ---------- audio layer ---------- */
.audio-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 20px 8px;
}
.audio-play {
  appearance: none;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: var(--text-primary-color, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transition: transform 150ms ease, box-shadow 150ms ease;
  padding: 0;
}
.audio-play ha-icon {
  --mdc-icon-size: 34px;
}
.audio-play:hover {
  transform: scale(1.05);
}
.audio-play:disabled {
  opacity: 0.5;
  cursor: default;
}
.audio-progress {
  width: 100%;
  max-width: 320px;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.12);
  cursor: pointer;
  overflow: hidden;
}
.audio-bar {
  height: 100%;
  width: 0;
  background: var(--primary-color);
  border-radius: 3px;
  transition: width 200ms linear;
}
.audio-time {
  font-size: 0.8em;
  color: var(--secondary-text-color);
  font-variant-numeric: tabular-nums;
}
.audio-empty {
  text-align: center;
  color: var(--secondary-text-color);
}
.audio-empty strong {
  display: block;
  color: var(--primary-text-color);
  font-weight: 500;
}
.audio-empty small {
  font-size: 0.85em;
}
.record {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
  color: var(--primary-text-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  padding: 0;
  transition: background-color 150ms ease;
}
.record.active {
  background: var(--error-color, #db4437);
  color: #fff;
  animation: pinboard-pulse 1.2s ease-in-out infinite;
}
@keyframes pinboard-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(219, 68, 55, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(219, 68, 55, 0); }
}
.record:disabled {
  opacity: 0.5;
  cursor: default;
}
.audio-status {
  position: absolute;
  right: 54px;
  top: 16px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
  color: var(--primary-text-color);
  font-size: 0.78em;
  z-index: 3;
  max-width: calc(100% - 70px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.audio-status.error {
  background: var(--error-color, #db4437);
  color: #fff;
}
.stage.natural .face.current.kind-image .layer-image {
  position: relative;
  inset: auto;
}

.layer-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--pinboard-fit, cover);
  background: var(--pinboard-placeholder-background);
}
.stage.natural .face.current .layer-image img {
  height: auto;
}
/* ---------- ken burns ---------- */
@keyframes pinboard-kenburns-a {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.12) translate(-2.5%, 1.5%); }
}
@keyframes pinboard-kenburns-b {
  from { transform: scale(1.12) translate(2%, -2%); }
  to { transform: scale(1) translate(0, 0); }
}
.stage.ken-burns .face.kind-image.current img {
  animation: pinboard-kenburns-a 22s ease-in-out infinite alternate;
  will-change: transform;
}
.stage.ken-burns .face-b.kind-image.current img {
  animation-name: pinboard-kenburns-b;
}
@media (prefers-reduced-motion: reduce) {
  .stage.ken-burns .face.kind-image.current img {
    animation: none;
  }
}

/* ---------- markers ---------- */
.markers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}
.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
.pin {
  appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--primary-color);
  color: #fff;
  font: inherit;
  font-size: 0.8em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  transition: transform 150ms ease;
}
.pin ha-icon {
  --mdc-icon-size: 16px;
}
.pin:hover,
.marker.open .pin {
  transform: scale(1.12);
}
.marker-label {
  appearance: none;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  max-width: 200px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font: inherit;
  font-size: 0.8em;
  line-height: 1.3;
  text-align: left;
  white-space: normal;
  width: max-content;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transition: opacity 150ms ease, visibility 0s linear 150ms;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.marker-label::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.8);
}
.marker.below .marker-label {
  bottom: auto;
  top: calc(100% + 8px);
}
.marker.below .marker-label::after {
  top: auto;
  bottom: 100%;
  border-top-color: transparent;
  border-bottom-color: rgba(0, 0, 0, 0.8);
}
.marker.align-left .marker-label {
  left: -13px;
  transform: none;
}
.marker.align-left .marker-label::after {
  left: 20px;
}
.marker.align-right .marker-label {
  left: auto;
  right: -13px;
  transform: none;
}
.marker.align-right .marker-label::after {
  left: auto;
  right: 14px;
  transform: none;
}
.marker.open .marker-label,
.marker:hover .marker-label {
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}

/* ---------- camera button ---------- */
.camera {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  padding: 0;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: background-color 150ms ease;
}
.camera:hover,
.camera:focus-visible {
  background: rgba(0, 0, 0, 0.65);
  outline: none;
}
.camera:disabled {
  opacity: 0.5;
  cursor: default;
}
.camera-status {
  position: absolute;
  right: 54px;
  top: 16px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.78em;
  z-index: 3;
  max-width: calc(100% - 70px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.camera-status.error {
  background: var(--error-color, #db4437);
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
  background: var(--pinboard-placeholder-background);
  border: 2px dashed var(--divider-color, rgba(0, 0, 0, 0.12));
  border-radius: var(--pinboard-radius);
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
.stage.with-dots .title-overlay {
  padding-bottom: 26px;
}

/* ---------- note layer ---------- */
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
  padding: 0 16px 8px;
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
.checklist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 4px 0 8px;
}
.check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 6px 4px 2px;
  border-radius: 8px;
  cursor: pointer;
  line-height: 1.4;
  transition: background-color 120ms ease;
}
.check:hover {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.05);
}
.check input {
  appearance: none;
  flex: none;
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  border: 2px solid var(--secondary-text-color);
  border-radius: 5px;
  display: inline-grid;
  place-content: center;
  cursor: pointer;
  background: transparent;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.check input::before {
  content: "";
  width: 10px;
  height: 6px;
  border-left: 2.5px solid #fff;
  border-bottom: 2.5px solid #fff;
  transform: rotate(-45deg) translate(1px, -1px) scale(0);
  transition: transform 120ms ease;
}
.check input:checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}
.check input:checked::before {
  transform: rotate(-45deg) translate(1px, -1px) scale(1);
}
.check input:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
.check.done span {
  text-decoration: line-through;
  opacity: 0.6;
}
.check.static {
  cursor: default;
}
.check.static:hover {
  background: transparent;
}
.check.static input {
  cursor: default;
  opacity: 0.7;
}
.check.busy {
  opacity: 0.6;
}
.todo-add {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 6px 0 4px;
}
.todo-add input {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 0.95em;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  color: inherit;
  outline: none;
}
.todo-add input:focus {
  border-color: var(--primary-color);
}
.todo-add button {
  appearance: none;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: var(--text-primary-color, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}
.todo-add button:disabled {
  opacity: 0.5;
  cursor: default;
}
.todo-add button ha-icon {
  --mdc-icon-size: 20px;
}
.todo-section {
  margin: 8px 0 2px;
  font-size: 0.75em;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
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
.note-footer,
.audio-footer {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px 16px 10px;
  min-height: 26px;
}
.note-footer::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -28px;
  height: 28px;
  background: linear-gradient(to bottom, transparent, var(--pinboard-note-background));
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease;
}
.layer-note.scrollable:not(.at-end) .note-footer::before {
  opacity: 1;
}
.note-meta,
.audio-meta {
  max-width: 55%;
  font-size: 0.75em;
  color: var(--secondary-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-meta:empty,
.audio-meta:empty {
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

/* ---------- overlay: arrows, dots, hint badge ---------- */
.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
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
  padding: 0;
  pointer-events: auto;
}
.nav.prev { left: 8px; }
.nav.next { right: 8px; }
.nav:hover,
.nav:focus-visible {
  background: rgba(0, 0, 0, 0.55);
  outline: none;
}
.stage:hover .nav,
.stage:focus-within .nav {
  opacity: 1;
}
@media (hover: none) {
  .nav { opacity: 0.8; }
}
.stage.kind-note .nav {
  /* Arrows would sit on top of the text; notes are turned with a tap, a swipe, the dots or the keys. */
  display: none;
}
.stage.editing .nav {
  display: none;
}

.dots {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  pointer-events: auto;
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
  transition: transform 150ms ease, background-color 150ms ease;
}
.dots button.active {
  background: #fff;
  transform: scale(1.3);
}
.stage.kind-note .dots button {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.25);
  box-shadow: none;
}
.stage.kind-note .dots button.active {
  background: var(--primary-color);
}

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
  color: var(--pinboard-badge-color);
  background: var(--pinboard-badge-background);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0.85;
  transition: opacity 200ms ease, transform 200ms ease;
}
.badge ha-icon {
  --mdc-icon-size: 16px;
}
.stage.kind-note .badge {
  color: var(--primary-text-color);
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
}
.stage:hover .badge {
  opacity: 1;
  transform: translateY(-2px);
}
.stage.editing .badge,
.stage.editing .dots {
  display: none;
}
@media (hover: hover) {
  .stage.hover-flip:not(.editing):hover .badge {
    opacity: 0;
  }
}

/* ---------- tile grid (layout: grid) ---------- */
.tiles-card {
  display: flex;
  flex-direction: column;
  padding: var(--pinboard-tile-gap, 8px);
  box-sizing: border-box;
}
.tiles-header {
  padding: 4px 8px 8px;
  font-size: 1.05em;
  font-weight: 500;
  color: var(--primary-text-color);
}
.tiles {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: var(--pinboard-tile-gap, 8px);
  grid-template-columns: repeat(auto-fill, minmax(min(var(--pinboard-tile-min, 150px), 100%), 1fr));
  grid-auto-rows: minmax(0, 1fr);
}
.tiles.fixed-columns {
  grid-template-columns: repeat(var(--pinboard-columns, 2), minmax(0, 1fr));
}
.tiles pinboard-card {
  min-width: 0;
  min-height: 0;
  --ha-card-border-width: 0;
  --ha-card-box-shadow: none;
  --ha-card-border-radius: calc(var(--pinboard-radius) - 4px);
}

/* ---------- small cards ---------- */
@container (max-width: 260px) {
  .badge span { display: none; }
  .badge { padding: 5px; gap: 0; }
  .title-overlay { font-size: 1em; padding: 24px 12px 10px; }
  .stage.with-dots .title-overlay { padding-bottom: 22px; }
  .note-header { padding: 8px 8px 4px 12px; gap: 8px; }
  .note-header .title { font-size: 1em; }
  .note-header ha-icon { --mdc-icon-size: 20px; }
  .note-body { padding: 0 12px 6px; font-size: 0.92em; line-height: 1.4; }
  .note-footer { padding: 2px 12px 8px; }
  .nav { width: 28px; height: 28px; }
  .nav ha-icon { --mdc-icon-size: 20px; }
  .placeholder small { display: none; }
}
@container (max-height: 160px) {
  .note-meta { display: none; }
  .note-header { padding-top: 6px; padding-bottom: 2px; }
  .note-body { padding-bottom: 4px; }
  .note-footer { padding-top: 0; padding-bottom: 6px; min-height: 22px; }
  .title-overlay { padding-top: 20px; }
  .placeholder ha-icon { display: none; }
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
