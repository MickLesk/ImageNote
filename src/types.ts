export type Transition = "flip" | "fade" | "slide" | "cube" | "none";
export type Direction = "horizontal" | "vertical";
export type Side = "image" | "note";
export type ImageFit = "cover" | "contain";

export interface MediaValue {
  media_content_id: string;
  media_content_type?: string;
}

export interface ImageNoteCardConfig {
  type: string;
  title?: string;
  image?: string | MediaValue;
  image_entity?: string;
  image_fit?: ImageFit;
  aspect_ratio?: string;
  note?: string;
  note_entity?: string;
  note_attribute?: string;
  transition?: Transition;
  direction?: Direction;
  default_side?: Side;
  duration?: number;
  auto_flip?: number;
  hover_flip?: boolean;
  show_hint?: boolean;
  show_title?: boolean;
}

export interface NormalizedConfig {
  type: string;
  title: string;
  image: string | MediaValue | undefined;
  image_entity: string;
  image_fit: ImageFit;
  aspect_ratio: string;
  note: string;
  note_entity: string;
  note_attribute: string;
  transition: Transition;
  direction: Direction;
  default_side: Side;
  duration: number;
  auto_flip: number;
  hover_flip: boolean;
  show_hint: boolean;
  show_title: boolean;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
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
