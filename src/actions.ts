import type { ActionConfig, HomeAssistant, NormalizedConfig } from "./types";

export type ActionKind = "tap" | "hold" | "double_tap";

/** Fires a Home Assistant frontend event on an element (bubbles through shadow roots). */
function fireEvent(node: HTMLElement, type: string, detail?: unknown): void {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

function confirmAction(config: ActionConfig, fallback: string): boolean {
  if (!config.confirmation) return true;
  const text =
    typeof config.confirmation === "object" && config.confirmation.text
      ? config.confirmation.text
      : fallback;
  return window.confirm(text);
}

/**
 * Runs a card action the way Home Assistant's own cards do. Returns true when the
 * action asks the card to flip so the caller can handle it.
 */
export async function runAction(
  node: HTMLElement,
  hass: HomeAssistant | undefined,
  card: NormalizedConfig,
  config: ActionConfig,
  confirmText: string,
): Promise<boolean> {
  const defaultEntity = card.note_entity || card.image_entity || undefined;
  switch (config.action) {
    case "flip":
      return true;
    case "none":
    case undefined:
      return false;
    case "more-info": {
      const entityId = config.entity ?? defaultEntity;
      if (entityId) fireEvent(node, "hass-more-info", { entityId });
      return false;
    }
    case "navigate": {
      if (!config.navigation_path) return false;
      if (!confirmAction(config, confirmText)) return false;
      if (config.navigation_replace) {
        window.history.replaceState(null, "", config.navigation_path);
      } else {
        window.history.pushState(null, "", config.navigation_path);
      }
      fireEvent(node, "location-changed", { replace: Boolean(config.navigation_replace) });
      return false;
    }
    case "url": {
      if (!config.url_path) return false;
      if (!confirmAction(config, confirmText)) return false;
      window.open(config.url_path, "_blank", "noopener");
      return false;
    }
    case "toggle": {
      const entityId = config.entity ?? defaultEntity;
      if (!entityId || !hass) return false;
      if (!confirmAction(config, confirmText)) return false;
      await hass.callService("homeassistant", "toggle", { entity_id: entityId });
      return false;
    }
    case "perform-action":
    case "call-service": {
      const service = config.perform_action ?? config.service;
      if (!service || !hass) return false;
      const [domain, name] = service.split(".", 2);
      if (!domain || !name) return false;
      if (!confirmAction(config, confirmText)) return false;
      const data: Record<string, unknown> = { ...(config.service_data ?? config.data ?? {}) };
      if (config.target) {
        Object.assign(data, config.target);
      }
      await hass.callService(domain, name, data);
      return false;
    }
    default:
      return false;
  }
}

/**
 * Tap / hold / double-tap detection with the same timings Home Assistant uses.
 * Calls `onAction` once per gesture. Double taps are only detected when the card
 * has a double_tap_action, so a plain tap stays instant otherwise.
 */
export class GestureDetector {
  private _holdTimer?: number;
  private _tapTimer?: number;
  private _held = false;
  private _startX = 0;
  private _startY = 0;
  private _cancelled = false;

  constructor(
    private readonly _target: HTMLElement,
    private readonly _onAction: (kind: ActionKind) => void,
    private readonly _options: { holdDelay: number; doubleTapWindow: number; hasDoubleTap: () => boolean; enabled: (ev: PointerEvent) => boolean },
  ) {
    _target.addEventListener("pointerdown", this._onPointerDown);
    _target.addEventListener("pointerup", this._onPointerUp);
    _target.addEventListener("pointercancel", this._onPointerCancel);
    _target.addEventListener("pointermove", this._onPointerMove);
    _target.addEventListener("contextmenu", this._onContextMenu);
  }

  destroy(): void {
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._tapTimer);
    this._target.removeEventListener("pointerdown", this._onPointerDown);
    this._target.removeEventListener("pointerup", this._onPointerUp);
    this._target.removeEventListener("pointercancel", this._onPointerCancel);
    this._target.removeEventListener("pointermove", this._onPointerMove);
    this._target.removeEventListener("contextmenu", this._onContextMenu);
  }

  private readonly _onPointerDown = (ev: PointerEvent): void => {
    if (!this._options.enabled(ev) || ev.button !== 0) return;
    this._cancelled = false;
    this._held = false;
    this._startX = ev.clientX;
    this._startY = ev.clientY;
    window.clearTimeout(this._holdTimer);
    this._holdTimer = window.setTimeout(() => {
      this._held = true;
      this._onAction("hold");
    }, this._options.holdDelay);
  };

  private readonly _onPointerMove = (ev: PointerEvent): void => {
    if (this._holdTimer === undefined) return;
    if (Math.abs(ev.clientX - this._startX) > 10 || Math.abs(ev.clientY - this._startY) > 10) {
      this._cancel();
    }
  };

  private readonly _onPointerCancel = (): void => {
    this._cancel();
  };

  private readonly _onContextMenu = (ev: Event): void => {
    // Long press on touch devices opens the context menu; we handle it as hold.
    if (this._holdTimer !== undefined || this._held) ev.preventDefault();
  };

  private readonly _onPointerUp = (ev: PointerEvent): void => {
    if (this._holdTimer === undefined && !this._held) return;
    if (ev.button !== 0) return;
    window.clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
    if (this._cancelled || this._held) {
      this._held = false;
      return;
    }
    if (!this._options.hasDoubleTap()) {
      this._onAction("tap");
      return;
    }
    if (this._tapTimer !== undefined) {
      window.clearTimeout(this._tapTimer);
      this._tapTimer = undefined;
      this._onAction("double_tap");
      return;
    }
    this._tapTimer = window.setTimeout(() => {
      this._tapTimer = undefined;
      this._onAction("tap");
    }, this._options.doubleTapWindow);
  };

  private _cancel(): void {
    window.clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
    this._cancelled = true;
  }
}
