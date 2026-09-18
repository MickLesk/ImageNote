// Uploading pictures: shared by the editor's upload button and the camera button on the card.
import { MEDIA_SOURCE_PREFIX } from "./const";
import type { HomeAssistant } from "./types";

export type UploadTarget = "image" | "media";

export interface UploadOptions {
  target: UploadTarget;
  /** Folder below /media for the media target; empty for the top level. */
  folder: string;
  /** Longest edge in pixels the picture is scaled down to before upload; 0 keeps the original. */
  maxSize: number;
  /** JPEG quality for downscaled pictures. */
  quality?: number;
}

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly code: "too_large" | "forbidden" | "http" | "network",
  ) {
    super(message);
  }
}

async function fetchWithAuth(hass: HomeAssistant, path: string, init: RequestInit): Promise<Response> {
  if (hass.fetchWithAuth) {
    return hass.fetchWithAuth(path, init);
  }
  const token = hass.auth?.data?.access_token ?? "";
  return fetch(path, { ...init, headers: { Authorization: `Bearer ${token}` } });
}

function checkResponse(response: Response): void {
  if (response.status === 413) throw new UploadError("too large", "too_large");
  if (response.status === 401 || response.status === 403) throw new UploadError("forbidden", "forbidden");
  if (!response.ok) throw new UploadError(`${response.status} ${response.statusText}`, "http");
}

/**
 * Scales a picture down so its longest edge is at most `maxSize` pixels. Phone photos are
 * 4000 px and several megabytes; a dashboard never needs that. Returns the original file
 * when it is small enough or cannot be decoded (SVG, unsupported formats).
 */
export async function downscaleImage(file: File, maxSize: number, quality = 0.85): Promise<File> {
  if (!maxSize || !file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return file;
  }
  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  if (longest <= maxSize) {
    bitmap.close();
    return file;
  }
  const scale = maxSize / longest;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const keepPng = file.type === "image/png";
  const type = keepPng ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, keepPng ? undefined : quality));
  if (!blob) return file;
  const name = keepPng ? file.name : file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
  return new File([blob], name, { type });
}

/** Home Assistant's own image store (/config/image), served by id. */
export async function uploadToImageStore(hass: HomeAssistant, file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetchWithAuth(hass, "/api/image/upload", { method: "POST", body });
  checkResponse(response);
  const media = (await response.json()) as { id: string };
  return `/api/image/serve/${media.id}/original`;
}

/** The local media folder (/media/<folder>/), stored as a plain file. Admins only. */
export async function uploadToMedia(hass: HomeAssistant, file: File, folder: string): Promise<string> {
  const clean = folder.trim().replace(/^\/+|\/+$/g, "");
  const target = `${MEDIA_SOURCE_PREFIX}media_source/local${clean ? `/${clean}` : ""}`;
  // A timestamp keeps two uploads of "photo.jpg" from overwriting each other.
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_") || "picture.jpg";
  const renamed = new File([file], `${Date.now()}-${safeName}`, { type: file.type });
  const body = new FormData();
  body.append("media_content_id", target);
  body.append("file", renamed);
  const response = await fetchWithAuth(hass, "/api/media_source/local_source/upload", { method: "POST", body });
  checkResponse(response);
  const result = (await response.json()) as { media_content_id: string };
  return result.media_content_id;
}

/** Downscales and uploads; resolves to the value to store as `image`. */
export async function uploadPicture(hass: HomeAssistant, file: File, options: UploadOptions): Promise<string> {
  const prepared = await downscaleImage(file, options.maxSize, options.quality);
  return options.target === "media"
    ? uploadToMedia(hass, prepared, options.folder)
    : uploadToImageStore(hass, prepared);
}
