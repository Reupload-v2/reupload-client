/** Upload session status returned by your backend status route. */
export type UploadSessionStatus =
  | "PENDING"
  | "UPLOADING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type PrepareUploadInput = {
  filename: string;
  contentType: string;
  size: number;
  projectId?: string;
  isPublic?: boolean;
};

export type PrepareUploadResult = {
  uploadUrl: string;
  uploadId: string;
  fileId: string;
  expiresIn?: number;
};

export type CompleteUploadInput = {
  uploadId: string;
};

export type CompleteUploadResult = {
  fileId: string;
  status: "processing";
  uploadId?: string;
};

export type UploadStatusResult = {
  status: UploadSessionStatus;
  fileId: string;
  failureReason?: string | null;
};

export type FileAccessVariant =
  | "original"
  | "thumb_64"
  | "thumb_160"
  | "thumb_320";

export type FileAccessQuery = {
  expiresIn?: number;
  variant?: FileAccessVariant;
  download?: boolean;
};

export type FileAccess = {
  url: string;
  accessType?: "cdn" | "cdn_public";
  expiresIn?: number | null;
  variant?: FileAccessVariant;
  download?: boolean;
};

export type GetFileAccessResult = {
  access: FileAccess;
};

/** Result of a full CDN upload through your backend. */
export type UploadFileResult = CompleteUploadResult & {
  uploadId: string;
};

export type UploadProgress = {
  /** 0–100 when length is known; otherwise `null`. */
  percent: number | null;
  loaded: number;
  total: number | null;
  phase: "prepare" | "cdn" | "complete";
};

export type PollUploadOptions = {
  intervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
};

export type UploadFileOptions = {
  filename?: string;
  projectId?: string;
  isPublic?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: UploadProgress) => void;
};

export type FileValidationRules = {
  maxBytes?: number;
  accept?: string[];
};

export type FileValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Optional gate invoked before upload starts (e.g. confirm dialog). Return `false` to abort. */
export type BeforeUploadHandler = (
  files: File[],
) => boolean | Promise<boolean>;
