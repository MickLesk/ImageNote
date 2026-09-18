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

export interface MarkerConfig {
  /** Position in percent of the picture's width and height. */
  x: number;
  y: number;
  label?: string;
  icon?: string;
  /** Shown with its state in the label; a tap on the marker opens more-info. */
  entity?: string;
}

export interface Marker {
  x: number;
  y: number;
  label: string;
  icon: string;
  entity: string;
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
  /** Pins on the picture with a label: "here is the stopcock". */
  markers?: MarkerConfig[];
  /** A voice memo or any audio file: URL or media-source id. */
  audio?: string | MediaValue;
  /** An input_text / text entity whose state is the audio address; enables recording on the card. */
  audio_entity?: string;
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
  markers: Marker[];
  audio: string | MediaValue | undefined;
  audio_entity: string;
}

export type SlideKind = "image" | "note" | "audio";

/** One page of the card: a picture, a note or a recording. */
export interface Slide extends NormalizedPage {
  kind: SlideKind;
  /** Index of the config entry this slide came from; an entry with several parts yields several slides. */
  entry: number;
}

export interface PinboardCardConfig extends PageConfig {
  type: string;
  /** Pictures, notes and recordings in free order. `images` is an older alias. */
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
  /** Swiping on the card turns pages and is kept away from dashboard swipe navigation. */
  swipe?: boolean;
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
  /** Longest edge for uploaded pictures in pixels; 0 keeps originals. */
  upload_max_size?: number;
  /** Centre-crop uploads to the card's aspect ratio. */
  upload_crop?: boolean;
  /** Slow zoom and pan on pictures, for wall panels. */
  ken_burns?: boolean;
  /** Camera button on pictures whose image_entity is an input_text / text entity. */
  show_camera?: boolean;
  /** Record button on audio pages whose audio_entity is an input_text / text entity. */
  show_record?: boolean;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface NormalizedConfig {
  type: string;
  title: string;
  /** The config entries (one per `slides` item, or one for the flat form). */
  entries: NormalizedPage[];
  /** All pages in order; an entry with several parts becomes several slides. */
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
  swipe: boolean;
  show_hint: boolean;
  show_title: boolean;
  show_updated: boolean;
  show_navigation: boolean;
  note_style: NoteStyle;
  expired_slides: ExpiredMode;
  checklist: boolean;
  checklist_writeback: boolean;
  upload_target: "image" | "media";
  upload_folder: string;
  upload_max_size: number;
  upload_crop: boolean;
  ken_burns: boolean;
  show_camera: boolean;
  show_record: boolean;
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
