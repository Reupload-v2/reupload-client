import type { FileValidationResult, FileValidationRules } from "./types.js";

/**
 * Validate a browser `File` before uploading (size, MIME allowlist).
 */
export function validateFile(
  file: File,
  rules: FileValidationRules = {},
): FileValidationResult {
  if (!file || file.size <= 0) {
    return { ok: false, reason: "File is empty." };
  }

  if (rules.maxBytes !== undefined && file.size > rules.maxBytes) {
    return {
      ok: false,
      reason: `File exceeds maximum size of ${formatBytes(rules.maxBytes)}.`,
    };
  }

  if (rules.accept?.length) {
    const type = file.type || "application/octet-stream";
    const allowed = rules.accept.some((pattern) => mimeMatches(pattern, type));
    if (!allowed) {
      return { ok: false, reason: "File type is not allowed." };
    }
  }

  return { ok: true };
}

function mimeMatches(pattern: string, type: string): boolean {
  if (pattern === type) return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1);
    return type.startsWith(prefix);
  }
  return false;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileMeta(file: File, filename?: string): {
  filename: string;
  contentType: string;
  size: number;
} {
  return {
    filename: filename?.trim() || file.name || "upload",
    contentType: file.type || "application/octet-stream",
    size: file.size,
  };
}
