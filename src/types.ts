export type Transition = "flip" | "fade" | "slide" | "cube" | "none";
export type Direction = "horizontal" | "vertical";
export type Side = "image" | "note";
export type ImageFit = "cover" | "contain";
export type Layout = "stack" | "grid";

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
  title?: string;
  image?: string | MediaValue;
  image_entity?: string;
  note?: string;
  note_entity?: string;
  note_attribute?: string;
}

export interface NormalizedPage {
  title: string;
  image: string | MediaValue | undefined;
  image_entity: string;
  note: string;
  note_entity: string;
  note_attribute: string;
}

export interface ImageNoteCardConfig extends PageConfig {
  type: string;
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
  upload_target?: "image" | "media";
  upload_folder?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface NormalizedConfig {
  type: string;
  title: string;
  pages: NormalizedPage[];
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
  auth?: { data?: { access_token?: string } };
}

export interface ResolvedMedia {
  url: string;
  mime_type: string;
}
