import type { PollUploadOptions, UploadSessionStatus } from "./types.js";

export type PollStatusFetcher = () => Promise<{
  status: UploadSessionStatus;
  fileId: string;
  failureReason?: string | null;
}>;

export async function pollUploadStatus(
  fetchStatus: PollStatusFetcher,
  options: PollUploadOptions = {},
): Promise<{
  status: UploadSessionStatus;
  fileId: string;
  failureReason?: string | null;
}> {
  const intervalMs = options.intervalMs ?? 1500;
  const maxAttempts = options.maxAttempts ?? 40;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const data = await fetchStatus();

    if (data.status === "COMPLETED" || data.status === "FAILED") {
      return data;
    }

    if (data.status === "CANCELLED") {
      return data;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs, options.signal);
    }
  }

  throw new Error("Upload processing timed out.");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
