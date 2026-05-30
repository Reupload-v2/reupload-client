import { ReuploadClient } from "./client.js";
import type { ReuploadClientOptions } from "./client.js";

declare global {
  interface ImportMeta {
    readonly env?: Record<string, string | undefined>;
  }
}

export type ReuploadClientEnvOptions = Omit<ReuploadClientOptions, "apiUrl"> & {
  /** Falls back to `NEXT_PUBLIC_API_URL`, `VITE_API_URL`, or `import.meta.env` variants. */
  apiUrl?: string;
};

function readEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[name]) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  const meta = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  if (meta?.[name]) {
    const value = String(meta[name]).trim();
    if (value) return value;
  }

  return undefined;
}

/**
 * Create a client from `NEXT_PUBLIC_API_URL` or `VITE_API_URL`.
 */
export function createReuploadClientFromEnv(
  options: ReuploadClientEnvOptions = {},
): ReuploadClient {
  const apiUrl =
    options.apiUrl ??
    readEnv("NEXT_PUBLIC_API_URL") ??
    readEnv("VITE_API_URL");

  if (!apiUrl) {
    throw new Error(
      "Missing backend API URL. Set NEXT_PUBLIC_API_URL or VITE_API_URL, or pass apiUrl.",
    );
  }

  return new ReuploadClient({
    apiUrl,
    ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
    ...(options.credentials !== undefined
      ? { credentials: options.credentials }
      : {}),
    ...(options.headers !== undefined ? { headers: options.headers } : {}),
    ...(options.routes !== undefined ? { routes: options.routes } : {}),
  });
}
