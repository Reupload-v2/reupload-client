"use client";

import { useCallback, useMemo, useState } from "react";

import type { ReuploadClient } from "../client.js";
import { createReuploadClientFromEnv } from "../env.js";
import { isReuploadClientError } from "../errors.js";
import type {
  FileValidationRules,
  UploadFileOptions,
  UploadFileResult,
  UploadProgress,
  UploadSessionStatus,
} from "../types.js";
import { omitUndefined } from "../utils/request.js";
import { validateFile } from "../validate.js";

export type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress?: UploadProgress }
  | { status: "processing"; uploadId: string; fileId: string }
  | {
      status: "completed";
      uploadId: string;
      fileId: string;
      sessionStatus: UploadSessionStatus;
    }
  | { status: "error"; message: string; httpStatus?: number };

export type UseReuploadUploadOptions = {
  client?: ReuploadClient;
  validation?: FileValidationRules;
  /** Poll after upload until terminal session status. Default `false`. */
  poll?: boolean;
  pollOptions?: {
    intervalMs?: number;
    maxAttempts?: number;
  };
};

export function useReuploadUpload(options: UseReuploadUploadOptions = {}) {
  const client = useMemo(
    () => options.client ?? createReuploadClientFromEnv(),
    [options.client],
  );

  const [state, setState] = useState<UploadState>({ status: "idle" });

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  const upload = useCallback(
    async (
      file: File,
      uploadOptions: UploadFileOptions = {},
    ): Promise<UploadFileResult | null> => {
      if (options.validation) {
        const check = validateFile(file, options.validation);
        if (!check.ok) {
          setState({ status: "error", message: check.reason });
          return null;
        }
      }

      setState({ status: "uploading" });

      try {
        const onProgress = (progress: UploadProgress) => {
          setState({ status: "uploading", progress });
          uploadOptions.onProgress?.(progress);
        };

        const result = await client.uploadFile(file, {
          ...uploadOptions,
          onProgress,
        });

        setState({
          status: "processing",
          uploadId: result.uploadId,
          fileId: result.fileId,
        });

        const shouldPoll = options.poll ?? false;
        if (shouldPoll) {
          const final = await client.pollUploadStatus(
            result.uploadId,
            omitUndefined({
              intervalMs: options.pollOptions?.intervalMs,
              maxAttempts: options.pollOptions?.maxAttempts,
              signal: uploadOptions.signal,
            }),
          );

          if (final.status === "COMPLETED") {
            setState({
              status: "completed",
              uploadId: result.uploadId,
              fileId: final.fileId,
              sessionStatus: final.status,
            });
          } else {
            setState({
              status: "error",
              message:
                final.failureReason ??
                `Upload ended with status ${final.status}.`,
            });
            return null;
          }
        } else {
          setState({
            status: "completed",
            uploadId: result.uploadId,
            fileId: result.fileId,
            sessionStatus: "COMPLETED",
          });
        }

        return {
          uploadId: result.uploadId,
          fileId: result.fileId,
          status: "processing",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        setState({
          status: "error",
          message,
          ...(isReuploadClientError(error)
            ? { httpStatus: error.status }
            : {}),
        });
        return null;
      }
    },
    [client, options.poll, options.pollOptions, options.validation],
  );

  return {
    client,
    state,
    upload,
    reset,
    isUploading: state.status === "uploading" || state.status === "processing",
  };
}
