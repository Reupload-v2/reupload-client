import { ReuploadClientError } from "./errors.js";
import type { UploadProgress } from "./types.js";
import { omitUndefined } from "./utils/request.js";

export type PutFileOptions = {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  onProgress?: (progress: UploadProgress) => void;
};

/**
 * PUT a browser `File` to the signed CDN `uploadUrl` from your prepare route.
 */
export async function putFileToUploadUrl(
  uploadUrl: string,
  file: File,
  options: PutFileOptions = {},
): Promise<void> {
  if (options.onProgress && typeof XMLHttpRequest !== "undefined") {
    await putWithXhr(uploadUrl, file, options);
    return;
  }

  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const response = await fetchImpl(
    uploadUrl,
    omitUndefined({
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      signal: options.signal,
    }),
  );

  if (!response.ok) {
    throw await ReuploadClientError.fromResponse(response, "cdn");
  }

  options.onProgress?.({
    percent: 100,
    loaded: file.size,
    total: file.size,
    phase: "cdn",
  });
}

function putWithXhr(
  uploadUrl: string,
  file: File,
  options: PutFileOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    if (options.signal) {
      if (options.signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      options.signal.addEventListener(
        "abort",
        () => {
          xhr.abort();
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    }

    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : file.size;
      const percent =
        event.lengthComputable && total > 0
          ? Math.round((event.loaded / total) * 100)
          : null;

      options.onProgress?.({
        percent,
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : file.size,
        phase: "cdn",
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(
        new ReuploadClientError(
          xhr.status,
          "CDN_UPLOAD_FAILED",
          `CDN upload failed with status ${xhr.status}.`,
          "cdn",
        ),
      );
    };

    xhr.onerror = () => {
      reject(
        new ReuploadClientError(
          0,
          "CDN_UPLOAD_FAILED",
          "CDN upload network error.",
          "cdn",
        ),
      );
    };

    xhr.send(file);
  });
}
