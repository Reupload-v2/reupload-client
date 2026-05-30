/**
 * Default paths for a backend file router that proxies Reupload.
 * Matches the Express example in the API docs (prepare / complete / status / access).
 */
export type FileRouterRoutes = {
  /** `POST` — create session, return signed CDN URL. Default `/uploads/prepare`. */
  prepare: string;
  /** `POST` — finalize CDN upload. Default `/uploads/complete`. */
  complete: string;
  /** `GET` — poll session status. Default `/uploads/:uploadId/status`. */
  status: (uploadId: string) => string;
  /** `GET` — signed download URL. Default `/files/:fileId/access`. */
  fileAccess: (fileId: string) => string;
};

export const DEFAULT_FILE_ROUTER_ROUTES: FileRouterRoutes = {
  prepare: "/uploads/prepare",
  complete: "/uploads/complete",
  status: (uploadId) => `/uploads/${encodeURIComponent(uploadId)}/status`,
  fileAccess: (fileId) => `/files/${encodeURIComponent(fileId)}/access`,
};

export function resolveRoutes(
  overrides?: Partial<FileRouterRoutes>,
): FileRouterRoutes {
  return {
    ...DEFAULT_FILE_ROUTER_ROUTES,
    ...overrides,
  };
}
