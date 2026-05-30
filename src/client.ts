import { putFileToUploadUrl } from "./cdn.js";
import type { BackendHttpOptions } from "./http.js";
import { BackendHttp } from "./http.js";
import { pollUploadStatus } from "./poll.js";
import { resolveRoutes, type FileRouterRoutes } from "./routes.js";
import { fileMeta } from "./validate.js";
import type {
  CompleteUploadResult,
  FileAccessQuery,
  GetFileAccessResult,
  PollUploadOptions,
  PrepareUploadInput,
  PrepareUploadResult,
  UploadFileOptions,
  UploadFileResult,
  UploadStatusResult,
} from "./types.js";
import { omitUndefined } from "./utils/request.js";

export type ReuploadClientOptions = BackendHttpOptions & {
  /** Override default backend file-router paths. */
  routes?: Partial<FileRouterRoutes>;
};

export class ReuploadClient {
  private readonly http: BackendHttp;
  private readonly fetchImpl: typeof fetch;
  readonly routes: FileRouterRoutes;

  constructor(options: ReuploadClientOptions) {
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.http = new BackendHttp({
      apiUrl: options.apiUrl,
      fetch: this.fetchImpl,
      ...(options.credentials !== undefined
        ? { credentials: options.credentials }
        : {}),
      ...(options.headers !== undefined ? { headers: options.headers } : {}),
    });
    this.routes = resolveRoutes(options.routes);
  }

  /**
   * CDN flow: `prepare` → PUT to signed URL → `complete`.
   * No Reupload API key in the browser.
   */
  async uploadFile(
    file: File,
    options: UploadFileOptions = {},
  ): Promise<UploadFileResult> {
    const meta = fileMeta(file, options.filename);

    options.onProgress?.({
      percent: null,
      loaded: 0,
      total: file.size,
      phase: "prepare",
    });

    const prepared = await this.prepareUpload(
      {
        ...meta,
        ...(options.projectId !== undefined
          ? { projectId: options.projectId }
          : {}),
        ...(options.isPublic !== undefined
          ? { isPublic: options.isPublic }
          : {}),
      },
      options.signal === undefined ? {} : { signal: options.signal },
    );

    await putFileToUploadUrl(prepared.uploadUrl, file, {
      fetch: this.fetchImpl,
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
      ...(options.onProgress !== undefined
        ? { onProgress: options.onProgress }
        : {}),
    });

    options.onProgress?.({
      percent: null,
      loaded: file.size,
      total: file.size,
      phase: "complete",
    });

    const completed = await this.completeUpload(
      { uploadId: prepared.uploadId },
      options.signal === undefined ? {} : { signal: options.signal },
    );

    return {
      uploadId: prepared.uploadId,
      fileId: completed.fileId ?? prepared.fileId,
      status: completed.status,
    };
  }

  async prepareUpload(
    input: PrepareUploadInput,
    init?: { signal?: AbortSignal },
  ): Promise<PrepareUploadResult> {
    return this.http.request<PrepareUploadResult>(
      "POST",
      this.routes.prepare,
      omitUndefined({
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        signal: init?.signal,
      }),
    );
  }

  async completeUpload(
    input: { uploadId: string },
    init?: { signal?: AbortSignal },
  ): Promise<CompleteUploadResult> {
    return this.http.request<CompleteUploadResult>(
      "POST",
      this.routes.complete,
      omitUndefined({
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        signal: init?.signal,
      }),
    );
  }

  async getUploadStatus(
    uploadId: string,
    init?: { signal?: AbortSignal },
  ): Promise<UploadStatusResult> {
    return this.http.request<UploadStatusResult>(
      "GET",
      this.routes.status(uploadId),
      omitUndefined({ signal: init?.signal }),
    );
  }

  async pollUploadStatus(
    uploadId: string,
    options: PollUploadOptions = {},
  ): Promise<UploadStatusResult> {
    return pollUploadStatus(
      () =>
        this.getUploadStatus(
          uploadId,
          options.signal === undefined ? {} : { signal: options.signal },
        ),
      options,
    );
  }

  async getFileAccess(
    fileId: string,
    query: FileAccessQuery = {},
    init?: { signal?: AbortSignal },
  ): Promise<GetFileAccessResult> {
    return this.http.request<GetFileAccessResult>(
      "GET",
      this.routes.fileAccess(fileId),
      omitUndefined({
        query: {
          expiresIn: query.expiresIn,
          variant: query.variant,
          download: query.download,
        },
        signal: init?.signal,
      }),
    );
  }

  /** Open a signed download URL in a new tab. */
  async openFileInNewTab(
    fileId: string,
    query?: FileAccessQuery,
  ): Promise<void> {
    const { access } = await this.getFileAccess(fileId, query ?? {});
    if (typeof window !== "undefined") {
      window.open(access.url, "_blank", "noopener,noreferrer");
    }
  }
}
