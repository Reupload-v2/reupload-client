import { ReuploadClientError } from "./errors.js";
import { omitUndefined } from "./utils/request.js";

export type BackendHttpOptions = {
  apiUrl: string;
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
};

export class BackendHttp {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly credentials: RequestCredentials | undefined;
  private readonly defaultHeaders: HeadersInit;

  constructor(options: BackendHttpOptions) {
    this.baseUrl = options.apiUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.credentials = options.credentials ?? undefined;
    this.defaultHeaders = options.headers ?? {};
  }

  async request<T>(
    method: string,
    path: string,
    init?: {
      body?: BodyInit;
      headers?: HeadersInit;
      query?: Record<string, string | number | boolean | undefined>;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const url = new URL(
      path.startsWith("/") ? path : `/${path}`,
      `${this.baseUrl}/`,
    );

    if (init?.query) {
      for (const [key, value] of Object.entries(init.query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }

    const headers = new Headers(this.defaultHeaders);
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const response = await this.fetchImpl(url, {
      method,
      headers,
      ...omitUndefined({
        credentials: this.credentials,
        body: init?.body,
        signal: init?.signal,
      }),
    });

    if (!response.ok) {
      throw await ReuploadClientError.fromResponse(response, "backend");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
