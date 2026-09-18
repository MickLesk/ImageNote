export type Transition = "flip" | "fade" | "slide" | "cube" | "none";
export type Direction = "horizontal" | "vertical";
export type Side = "image" | "note";
export type ImageFit = "cover" | "contain";
export type Layout = "stack" | "grid";
export type NoteStyle = "plain" | "sticky";
export type ExpiredMode = "dim" | "hide";

export type ActionName =
  | "flip"
  | "none"
  | "more-info"
  | "navigate"
  | "url"
  | "toggle"
  | "perform-action"
  | "call-service";

export interface ActionConfig {
  action: ActionName | string;
  entity?: string;
  navigation_path?: string;
  navigation_replace?: boolean;
  url_path?: string;
  perform_action?: string;
  service?: string;
  data?: Record<string, unknown>;
  service_data?: Record<string, unknown>;
  target?: Record<string, unknown>;
  confirmation?: boolean | { text?: string };
}

export interface MediaValue {
  media_content_id: string;
  media_content_type?: string;
}

export interface PageConfig {
  /** Forces the kind of an entry without content yet (the editor's "add note" creates such an entry). */
  kind?: SlideKind;
  title?: string;
  image?: string | MediaValue;
  image_entity?: string;
  note?: string;
  note_entity?: string;
  note_attribute?: string;
  /** "2026-10-01" or "2026-10-01 18:00": after this the slide is dimmed or hidden. */
  expires?: string;
  /** Tint of a note page: a preset name (yellow, green, …) or any CSS colour. */
  color?: string;
}

export interface NormalizedPage {
  kind?: SlideKind;
  title: string;
  image: string | MediaValue | undefined;
  image_entity: string;
  note: string;
  note_entity: string;
  note_attribute: string;
  expires: string;
  color: string;
}

export type SlideKind = "image" | "note";

/** One screen of the card: either a picture or a note. */
export interface Slide extends NormalizedPage {
  kind: SlideKind;
  /** Index of the config entry this slide came from (an entry with picture and note yields two slides). */
  entry: number;
}

export interface ImageNoteCardConfig extends PageConfig {
  type: string;
  /** Pictures and notes in free order. `images` is an older alias. */
  slides?: Array<PageConfig | string>;
  images?: Array<PageConfig | string>;
  layout?: Layout;
  columns?: number;
  image_fit?: ImageFit;
  aspect_ratio?: string;
  transition?: Transition;
  direction?: Direction;
  default_side?: Side;
  duration?: number;
  auto_flip?: number;
  auto_advance?: number;
  hover_flip?: boolean;
  show_hint?: boolean;
  show_title?: boolean;
  show_updated?: boolean;
  show_navigation?: boolean;
  note_style?: NoteStyle;
  expired_slides?: ExpiredMode;
  checklist?: boolean;
  checklist_writeback?: boolean;
  upload_target?: "image" | "media";
  upload_folder?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface NormalizedConfig {
  type: string;
  title: string;
  /** The config entries (one per `slides` item, or one for the flat form). */
  entries: NormalizedPage[];
  /** All screens in order; an entry with picture and note becomes two slides. */
  slides: Slide[];
  layout: Layout;
  columns: number;
  image_fit: ImageFit;
  aspect_ratio: string;
  transition: Transition;
  direction: Direction;
  default_side: Side;
  duration: number;
  auto_flip: number;
  auto_advance: number;
  hover_flip: boolean;
  show_hint: boolean;
  show_title: boolean;
  show_updated: boolean;
  show_navigation: boolean;
  note_style: NoteStyle;
  expired_slides: ExpiredMode;
  checklist: boolean;
  checklist_writeback: boolean;
  tap_action: ActionConfig;
  hold_action: ActionConfig;
  double_tap_action: ActionConfig;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language?: string;
  locale?: { language?: string };
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ): Promise<unknown>;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  fetchWithAuth?(path: string, init?: RequestInit): Promise<Response>;
  connection?: {
    subscribeMessage<T>(
      callback: (message: T) => void,
      message: Record<string, unknown>,
    ): Promise<() => Promise<void>>;
  };
  auth?: { data?: { access_token?: string } };
}

export interface ResolvedMedia {
  url: string;
  mime_type: string;
}
