export type BackendErrorBody = {
  error?: string;
  message?: string;
};

/** Error from your backend file router or the CDN PUT step. */
export class ReuploadClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly phase: "backend" | "cdn";

  constructor(
    status: number,
    code: string,
    message: string,
    phase: "backend" | "cdn" = "backend",
  ) {
    super(message);
    this.name = "ReuploadClientError";
    this.status = status;
    this.code = code;
    this.phase = phase;
  }

  static async fromResponse(
    response: Response,
    phase: "backend" | "cdn" = "backend",
  ): Promise<ReuploadClientError> {
    let code = "UNKNOWN";
    let message = `Request failed with status ${response.status}.`;

    try {
      const body = (await response.json()) as BackendErrorBody;
      if (typeof body.error === "string") code = body.error;
      if (typeof body.message === "string") message = body.message;
    } catch {
      // ignore non-JSON bodies
    }

    return new ReuploadClientError(response.status, code, message, phase);
  }
}

export function isReuploadClientError(
  error: unknown,
): error is ReuploadClientError {
  return error instanceof ReuploadClientError;
}
